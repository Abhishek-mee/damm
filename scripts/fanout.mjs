#!/usr/bin/env node
/**
 * Parallel fanout.
 *
 * Reads a task file, creates one worktree per agent, and runs one OpenCode
 * session per task. Dry-run by default: nothing starts until `--run`.
 *
 *   npm run fanout -- --tasks damm.tasks.json
 *   npm run fanout -- --tasks damm.tasks.json --run
 *   npm run fanout -- --tasks damm.tasks.json --run --concurrency 2
 *   npm run fanout -- --tasks damm.tasks.json --run --only auth-expiry
 *
 * Safety properties:
 *   - one task per agent per run (two tasks cannot share a worktree)
 *   - concurrency is clamped to 1..4 for free models
 *   - every run is followed by the ownership check
 *   - a failed run is reported, never merged automatically
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ROOT } from './ownership.mjs';
import { activeContext } from './context.mjs';
import { agentNames, checkAgent, ensureWorktree } from './worktree.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));

function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function fail(message) {
  throw new Error(message);
}

function readTasks(file) {
  if (!fs.existsSync(file)) {
    fail(`Task file not found: ${file}. Copy damm.tasks.example.json to damm.tasks.json and edit it.`);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }

  const tasks = Array.isArray(data) ? data : data.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) fail(`${file} must contain a non-empty "tasks" array.`);

  return {
    concurrency: Number(data.concurrency ?? 2),
    tasks: tasks.map((task, index) => {
      const id = String(task.id ?? `task-${index + 1}`).trim();
      if (!/^[a-zA-Z0-9._-]+$/.test(id)) fail(`Task id "${id}" must use letters, digits, dot, dash, or underscore.`);
      if (!task.agent) fail(`Task "${id}" is missing "agent".`);
      if (!task.prompt || String(task.prompt).trim().length < 10) fail(`Task "${id}" needs a prompt of at least 10 characters.`);
      return {
        id,
        agent: String(task.agent).trim(),
        prompt: String(task.prompt).trim(),
        verify: task.verify ? String(task.verify).trim() : null,
      };
    }),
  };
}

function validateTasks(tasks) {
  const roster = new Set(agentNames());
  const seenIds = new Set();
  const seenAgents = new Map();

  for (const task of tasks) {
    if (!roster.has(task.agent)) fail(`Task "${task.id}": unknown agent "${task.agent}". Roster: ${[...roster].join(', ')}`);
    if (seenIds.has(task.id)) fail(`Duplicate task id "${task.id}".`);
    seenIds.add(task.id);
    if (seenAgents.has(task.agent)) {
      fail(
        `Tasks "${seenAgents.get(task.agent)}" and "${task.id}" both target agent "${task.agent}". ` +
          'Two tasks cannot share one worktree; split them into separate runs with --only.',
      );
    }
    seenAgents.set(task.agent, task.id);
  }
}

function resolveOpenCode() {
  const override = process.env.DAMM_OPENCODE_BIN;
  if (override) return override;
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(finder, ['opencode'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function writePrompt(worktreePath, task) {
  const directory = path.join(worktreePath, '.damm', 'prompts');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${task.id}.md`);
  const body = [
    `# Task: ${task.id}`,
    '',
    `Agent: \`${task.agent}\``,
    '',
    '## Work',
    '',
    task.prompt,
    '',
    '## Rules',
    '',
    '- Work only in this worktree and only inside your ownership lane.',
    '- Read `DAMM.md` and your agent file before editing.',
    '- Build and test with the project commands. Do not claim a result you did not see.',
    '- Commit your work with a message that explains why.',
    '- End with the handoff block from `DAMM.md`.',
    '',
    task.verify ? `## Verification\n\nRun this before you report:\n\n\`\`\`bash\n${task.verify}\n\`\`\`\n` : '',
  ].join('\n');
  fs.writeFileSync(file, body, 'utf8');
  return file;
}

function runCommand(command, { cwd, logPath, timeoutMs }) {
  return new Promise((resolve) => {
    const stream = fs.createWriteStream(logPath, { flags: 'a' });
    stream.write(`$ ${command}\n\n`);

    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, DAMM_AGENT_RUN: '1' },
    });

    let timedOut = false;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs)
      : null;

    child.stdout.on('data', (chunk) => stream.write(chunk));
    child.stderr.on('data', (chunk) => stream.write(chunk));

    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      stream.write(`\nspawn error: ${error.message}\n`);
      stream.end(() => resolve({ status: 1, timedOut }));
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      stream.write(`\nexit code: ${code}\n`);
      stream.end(() => resolve({ status: code ?? 1, timedOut }));
    });
  });
}

function verifyCommand(task, worktreePath) {
  if (!task.verify) return null;
  const result = spawnSync(task.verify, {
    cwd: worktreePath,
    shell: true,
    stdio: 'inherit',
    windowsHide: true,
  });
  return result.status === 0;
}

async function runTask(task, plan, opencode) {
  const logPath = path.join(ROOT, '.damm', 'logs', `${task.id}.log`);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const instruction = `Read .damm/prompts/${task.id}.md and complete the task. Follow DAMM.md. Report the handoff.`;
  const command = `"${opencode}" run --agent ${task.agent} "${instruction}"`;

  console.log(`start ${task.id.padEnd(24)} ${task.agent.padEnd(12)} ${plan.worktreePath}`);
  const started = Date.now();
  const result = await runCommand(command, { cwd: plan.worktreePath, logPath, timeoutMs: plan.timeoutMs });
  const seconds = Math.round((Date.now() - started) / 1000);

  const lane = checkAgent(task.agent, { quiet: true });
  const verified = result.status === 0 ? verifyCommand(task, plan.worktreePath) : null;

  const status = result.status === 0 && lane.ok && verified !== false ? 'ok' : 'FAIL';
  console.log(
    `${status.padEnd(5)} ${task.id.padEnd(24)} ${task.agent.padEnd(12)} ${seconds}s  lane ${lane.ok ? 'pass' : 'FAIL'}` +
      `${verified === null ? '' : `  verify ${verified ? 'pass' : 'FAIL'}`}  ${path.relative(ROOT, logPath)}`,
  );

  return { task, status, seconds, lane, verified, logPath, timedOut: result.timedOut };
}

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function main() {
  if (flags.has('--help') || flags.has('-h')) {
    console.log(`DAMM fanout

Usage:
  node scripts/fanout.mjs --tasks damm.tasks.json            dry run (default)
  node scripts/fanout.mjs --tasks damm.tasks.json --run      execute
  node scripts/fanout.mjs --tasks damm.tasks.json --run --concurrency 2
  node scripts/fanout.mjs --tasks damm.tasks.json --run --only <task-id>

Options:
  --tasks <file>        task file (default: damm.tasks.json)
  --run                 actually start the agents
  --concurrency <n>     1..4, default from the task file (max 4)
  --only <id>           run one task; repeatable with a comma list
  --timeout <seconds>   kill a task after this long
  --no-worktree         do not create missing worktrees (dry run still plans them)
`);
    return;
  }

  const context = activeContext();
  const taskFile = path.resolve(process.cwd(), option('--tasks', 'damm.tasks.json'));
  const { tasks: allTasks, concurrency: fileConcurrency } = readTasks(taskFile);
  validateTasks(allTasks);

  const only = option('--only');
  const tasks = only
    ? allTasks.filter((task) => only.split(',').map((id) => id.trim()).includes(task.id))
    : allTasks;

  if (tasks.length === 0) fail(`--only matched no task. Available: ${allTasks.map((task) => task.id).join(', ')}`);

  const requested = Number(option('--concurrency', fileConcurrency));
  const concurrency = Math.max(1, Math.min(4, Number.isFinite(requested) ? requested : 2));
  const timeoutSeconds = Number(option('--timeout', 0));
  const opencode = resolveOpenCode();
  const execute = flags.has('--run');

  console.log('DAMM fanout');
  console.log(`  mode:        ${context.mode}`);
  console.log(`  project:     ${context.project}`);
  console.log(`  base:        ${context.baseBranch}`);
  console.log(`  tasks:       ${tasks.length} of ${allTasks.length} (${path.relative(process.cwd(), taskFile)})`);
  console.log(`  concurrency: ${concurrency}`);
  console.log(`  opencode:    ${opencode ?? 'not found on PATH'}`);
  console.log(`  run:         ${execute ? 'yes' : 'no (dry run; pass --run to execute)'}`);
  console.log('');

  if (execute && !opencode) {
    fail(
      'The opencode CLI is not on PATH. Install it, or set DAMM_OPENCODE_BIN to its full path. ' +
        'Dry runs work without it.',
    );
  }

  const plans = [];
  for (const task of tasks) {
    if (execute && !flags.has('--no-worktree')) {
      const result = ensureWorktree(task.agent);
      plans.push({ ...task, worktreePath: result.worktreePath, created: result.created });
    } else {
      const worktreePath = path.join(context.worktreeRoot, task.agent);
      if (execute && !fs.existsSync(worktreePath)) {
        fail(`No worktree for ${task.agent} at ${worktreePath}. Drop --no-worktree or create it first.`);
      }
      plans.push({ ...task, worktreePath, created: !fs.existsSync(worktreePath) });
    }
  }

  for (const plan of plans) {
    if (execute) writePrompt(plan.worktreePath, plan);
    plan.timeoutMs = timeoutSeconds > 0 ? timeoutSeconds * 1000 : 0;
    console.log(
      `plan  ${plan.id.padEnd(24)} ${plan.agent.padEnd(12)} ${plan.created ? 'new worktree' : 'existing'}  ${plan.worktreePath}`,
    );
  }

  if (!execute) {
    console.log('');
    console.log('Dry run only. Nothing was started.');
    console.log(`Execute with: npm run fanout -- --tasks ${path.relative(process.cwd(), taskFile)} --run`);
    return;
  }

  console.log('');
  const results = await pool(plans, concurrency, (plan) => runTask(plan, plan, opencode));

  console.log('');
  console.log('Summary');
  for (const result of results) {
    const lane = result.lane.ok ? 'lane pass' : `lane FAIL: ${result.lane.violations.join(', ')}`;
    console.log(`  ${result.status.padEnd(5)} ${result.task.id.padEnd(24)} ${lane}`);
  }

  const failed = results.filter((result) => result.status !== 'ok');
  if (failed.length > 0) {
    console.log('');
    console.log(`${failed.length} task${failed.length === 1 ? '' : 's'} need attention. Logs: ${path.join(ROOT, '.damm', 'logs')}`);
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('All tasks finished and stayed inside their lanes.');
  console.log('Review each branch, then merge one at a time:');
  for (const result of results) console.log(`  npm run worktree -- merge ${result.task.agent}`);
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});

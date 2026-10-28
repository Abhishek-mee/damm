#!/usr/bin/env node
/**
 * One-command setup for a fresh DAMM clone.
 *
 * Safe to re-run. It never overwrites .env.local, never touches git history,
 * and never needs a network connection.
 *
 *   node scripts/setup.mjs                 # check the workspace
 *   node scripts/setup.mjs --agent core     # also create one worktree
 *   node scripts/setup.mjs --worktrees      # create all 11 worktrees
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const wantsHelp = args.includes('--help') || args.includes('-h');
const allWorktrees = args.includes('--worktrees');
const noDoctor = args.includes('--no-doctor');
const agentIndex = args.indexOf('--agent');
const agent = agentIndex >= 0 ? args[agentIndex + 1] : null;
const failures = [];

function line(text = '') {
  console.log(text);
}

function run(script, extra = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...extra], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
  });
  return result.status === 0;
}

function gitOkay() {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function keyState() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return 'missing';
  const key = fs.readFileSync(file, 'utf8').match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]?.trim() ?? '';
  if (!key) return 'empty';
  return key.startsWith('sk-or-v1-') ? 'set' : 'unexpected';
}

function agentNames() {
  const directory = path.join(ROOT, '.opencode', 'agents');
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.slice(0, -3))
    .sort();
}

function help() {
  line('DAMM setup');
  line('');
  line('Usage:');
  line('  node scripts/setup.mjs                  check this checkout');
  line('  node scripts/setup.mjs --agent <name>   check, then create one worktree');
  line('  node scripts/setup.mjs --worktrees      check, then create all 11 worktrees');
  line('');
  line('Options:');
  line('  --no-doctor    skip the environment report');
  line('  --help         show this help');
  line('');
  line(`Agents: ${agentNames().join(', ')}`);
  line('');
  line('Attach another project:  npm run attach -- <path>');
}

function heading(text) {
  line('');
  line(text);
  line('='.repeat(text.length));
}

if (wantsHelp) {
  help();
  process.exit(0);
}

line('');
line('DAMM setup');
line('==========');
line(`Root: ${ROOT}`);

heading('1. Prerequisites');
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20) {
  line(`ok   Node ${process.versions.node}`);
} else {
  line(`FAIL Node ${process.versions.node} is too old. Install Node 20 or newer.`);
  failures.push('Node.js 20+ is required.');
}

if (gitOkay()) {
  line('ok   git repository');
} else {
  line('FAIL not a git repository. Run setup from the cloned DAMM folder.');
  failures.push('git repository not found.');
}

if (failures.length > 0) {
  line('');
  line('Setup cannot continue until the items above are fixed.');
  process.exit(1);
}

heading('2. Local environment');
const envFile = path.join(ROOT, '.env.local');
if (!fs.existsSync(envFile)) {
  const example = path.join(ROOT, '.env.example');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, envFile);
    line('ok   created .env.local from .env.example');
    line('     add OPENROUTER_API_KEY before running the model check');
  } else {
    line('warn .env.example is missing; create .env.local manually');
  }
} else {
  line('ok   .env.local already exists (left untouched)');
}

const state = keyState();
if (state === 'set') line('ok   OPENROUTER_API_KEY is set');
else if (state === 'missing') line('warn .env.local not found');
else if (state === 'empty') line('warn OPENROUTER_API_KEY is empty');
else line('warn OPENROUTER_API_KEY does not look like an OpenRouter key');

heading('3. Repository validation');
if (!run('validate.mjs')) {
  failures.push('Validation failed.');
}

if (!noDoctor) {
  heading('4. Environment report');
  run('doctor.mjs');
}

if (allWorktrees && agent) {
  line('');
  line('FAIL use --worktrees or --agent, not both.');
  failures.push('Conflicting worktree options.');
} else if (allWorktrees) {
  heading('5. Worktrees');
  if (!run('worktree.mjs', ['bootstrap'])) failures.push('Could not create all worktrees.');
} else if (agent) {
  heading('5. Worktree');
  if (!agentNames().includes(agent)) {
    line(`FAIL unknown agent "${agent}".`);
    failures.push('Unknown agent.');
  } else if (!run('worktree.mjs', ['new', agent])) {
    failures.push(`Could not create the ${agent} worktree.`);
  }
}

heading('Next');
if (state !== 'set') {
  line('1. Put your OpenRouter key in .env.local:');
  line('     OPENROUTER_API_KEY=sk-or-v1-...');
  line('2. Sync it to any existing worktrees:  npm run worktree -- sync-env');
  line('3. Test the free models:               npm run check-models');
  line('4. Connect the provider once in OpenCode: /connect -> OpenRouter');
  line('5. Create a worktree and open it:      npm run worktree -- new core');
  line('6. Or attach another project:          npm run attach -- ../my-project');
  line('7. Plan a parallel run:                npm run fanout -- --tasks damm.tasks.json');
} else {
  line('1. Test the free models:               npm run check-models');
  line('2. Connect the provider once in OpenCode: /connect -> OpenRouter');
  line('3. Create a worktree and open it:      npm run worktree -- new core');
  line('4. Or attach another project:          npm run attach -- ../my-project');
  line('5. Plan a parallel run:                npm run fanout -- --tasks damm.tasks.json');
}
line('');
line('Docs: README.md, docs/SETUP.md, docs/ATTACH.md, docs/PARALLEL.md, docs/WORKTREES.md');

if (failures.length > 0) {
  line('');
  line(`Setup finished with ${failures.length} problem${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) line(`  - ${failure}`);
  process.exit(1);
}

line('');
line('Setup complete. The workspace is ready; attach a project or open a worktree.');

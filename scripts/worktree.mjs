#!/usr/bin/env node
/**
 * DAMM worktree manager.
 *
 * One agent = one worktree = one branch = one ownership lane.
 * The main checkout is the control plane and is never edited by agents.
 *
 * Works in this repository (self mode) and in a project attached with
 * `npm run attach` (attached mode). The active project comes from
 * scripts/context.mjs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ROOT, laneViolations } from './ownership.mjs';
import { activeContext } from './context.mjs';
import { installKit, printKitResult } from './kit.mjs';

function runGit(args, cwd, allowFailure = false) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed (${result.status})${detail ? `: ${detail}` : ''}`);
  }

  return result;
}

function normalize(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function readWorktrees(repo) {
  const raw = runGit(['worktree', 'list', '--porcelain'], repo).stdout;
  const entries = [];
  let current = null;

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      if (current) entries.push(current);
      current = { path: normalize(line.slice('worktree '.length)), branch: null, head: null };
    } else if (current && line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length);
    }
  }

  if (current) entries.push(current);
  return entries;
}

function findMain(entries, context) {
  const project = normalize(context.project);
  const main = entries.find((entry) => entry.path === project);
  if (main) return main;

  const fallback = entries.find((entry) => entry.branch === `refs/heads/${context.baseBranch}`);
  if (fallback) return fallback;

  throw new Error(`No worktree found for the project at ${context.project}.`);
}

function agentNames() {
  const directory = path.join(ROOT, '.opencode', 'agents');
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort();
}

function findAgentWorktree(entries, agent) {
  return entries.find((entry) => entry.branch === `refs/heads/agent/${agent}`);
}

function isDirty(worktreePath) {
  const result = runGit(['status', '--porcelain'], worktreePath, true);
  return (result.stdout || '').trim().length > 0;
}

function splitNul(value) {
  return (value || '')
    .split('\0')
    .map((item) => item.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter(Boolean);
}

function changedFiles(worktreePath, baseBranch) {
  const files = new Set();

  for (const args of [
    ['diff', '--name-only', '-z'],
    ['diff', '--cached', '--name-only', '-z'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
    ['diff', '--name-only', '-z', `${baseBranch}...HEAD`],
  ]) {
    const result = runGit(args, worktreePath, true);
    for (const file of splitNul(result.stdout)) files.add(file);
  }

  files.delete('.env.local');
  return [...files].sort();
}

function copyLocalEnv(context, worktreePath) {
  const source = path.join(context.project, '.env.local');
  if (!fs.existsSync(source)) return false;
  fs.copyFileSync(source, path.join(worktreePath, '.env.local'));
  return true;
}

function installKitIfNeeded(context, worktreePath) {
  if (context.mode !== 'attached') return null;
  return installKit(worktreePath, { exclude: context.excludeKit });
}

function printContext(context) {
  console.log(`Mode:      ${context.mode}${context.mode === 'attached' ? ` (${context.source})` : ''}`);
  console.log(`Project:   ${context.project}`);
  console.log(`Base:      ${context.baseBranch}`);
  console.log(`Worktrees: ${context.worktreeRoot}`);
}

function printHelp() {
  console.log(`DAMM worktree manager

Usage:
  node scripts/worktree.mjs list
  node scripts/worktree.mjs status
  node scripts/worktree.mjs new <agent>
  node scripts/worktree.mjs bootstrap
  node scripts/worktree.mjs check <agent>
  node scripts/worktree.mjs merge <agent> [--skip-tests]
  node scripts/worktree.mjs remove <agent> [--force]
  node scripts/worktree.mjs sync-env

Agents: ${Object.keys(activeContext().ownership).join(', ')}

The main checkout is the control plane. Agents work in sibling directories
under the worktree root on branch agent/<agent>. Attach another project with
"npm run attach -- <path>".`);
}

function commandList() {
  const context = activeContext();
  const entries = readWorktrees(context.project);
  const main = findMain(entries, context);

  printContext(context);
  console.log(`Main:      ${main.path}`);
  console.log('');
  console.log('AGENT'.padEnd(16), 'BRANCH'.padEnd(24), 'STATE'.padEnd(9), 'PATH');
  console.log('-'.repeat(92));

  for (const agent of agentNames()) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) {
      console.log(agent.padEnd(16), `agent/${agent}`.padEnd(24), 'missing'.padEnd(9), path.join(context.worktreeRoot, agent));
      continue;
    }
    const state = isDirty(entry.path) ? 'dirty' : 'clean';
    console.log(agent.padEnd(16), (entry.branch || '').replace('refs/heads/', '').padEnd(24), state.padEnd(9), entry.path);
  }
}

function commandStatus() {
  const context = activeContext();
  const entries = readWorktrees(context.project);
  findMain(entries, context);

  printContext(context);
  console.log('');

  for (const agent of agentNames()) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) {
      console.log(`${agent}: no worktree`);
      continue;
    }

    const dirty = isDirty(entry.path);
    const last = runGit(['log', '-1', '--pretty=%h %s'], entry.path, true).stdout.trim();
    const counts = runGit(
      ['rev-list', '--left-right', '--count', `${context.baseBranch}...HEAD`],
      entry.path,
      true,
    ).stdout.trim();
    const [behind, ahead] = counts.split(/\s+/).map((value) => Number(value) || 0);
    console.log(`${agent}: ${dirty ? 'dirty' : 'clean'} | ahead ${ahead} behind ${behind} | ${last || 'no commits'}`);
    console.log(`  ${entry.path}`);
  }
}

function ensureWorktree(agent) {
  const context = activeContext();
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs new <agent>');
  if (!agentNames().includes(agent)) {
    throw new Error(`Unknown agent "${agent}". Run "node scripts/worktree.mjs list" for the roster.`);
  }

  const entries = readWorktrees(context.project);
  const main = findMain(entries, context);
  const worktreePath = path.join(context.worktreeRoot, agent);
  const branch = `agent/${agent}`;

  const checkedOut = findAgentWorktree(entries, agent);
  if (checkedOut) {
    if (normalize(checkedOut.path) === normalize(worktreePath)) {
      return { agent, branch, worktreePath: checkedOut.path, created: false, context };
    }
    throw new Error(`Branch ${branch} is already checked out at ${checkedOut.path}`);
  }

  if (fs.existsSync(worktreePath)) {
    throw new Error(`Worktree path already exists but is not a git worktree: ${worktreePath}`);
  }

  if (isDirty(main.path)) {
    throw new Error('The main checkout is dirty. Commit or move those changes before creating a worktree.');
  }

  fs.mkdirSync(context.worktreeRoot, { recursive: true });

  const branchExists =
    runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], main.path, true).status === 0;

  if (branchExists) {
    runGit(['worktree', 'add', worktreePath, branch], main.path);
  } else {
    runGit(['worktree', 'add', '-b', branch, worktreePath, context.baseBranch], main.path);
  }

  const envCopied = copyLocalEnv(context, worktreePath);
  const kit = installKitIfNeeded(context, worktreePath);

  return { agent, branch, worktreePath, created: true, envCopied, kit, context };
}

function commandNew(agent) {
  const result = ensureWorktree(agent);

  if (!result.created) {
    console.log(`${agent} already has a worktree at ${result.worktreePath}`);
    return;
  }

  console.log(`Created ${agent}`);
  console.log(`  branch:   ${result.branch}`);
  console.log(`  worktree: ${result.worktreePath}`);
  console.log(`  base:     ${result.context.baseBranch}`);
  console.log(`  env:      ${result.envCopied ? '.env.local copied' : 'no .env.local found'}`);
  if (result.kit) printKitResult(result.kit);
  console.log('');
  console.log('Open that folder in OpenCode, select this agent, and work there.');
}

function commandBootstrap() {
  const context = activeContext();
  const results = [];

  for (const agent of agentNames()) {
    if (fs.existsSync(path.join(context.worktreeRoot, agent))) {
      results.push([agent, 'exists']);
      continue;
    }
    try {
      ensureWorktree(agent);
      results.push([agent, 'created']);
    } catch (error) {
      results.push([agent, `failed: ${error.message}`]);
    }
  }

  console.log('\nBootstrap summary');
  for (const [agent, result] of results) console.log(`  ${agent.padEnd(16)} ${result}`);
}

function checkAgent(agent, { quiet = false } = {}) {
  const context = activeContext();
  const entries = readWorktrees(context.project);
  const entry = findAgentWorktree(entries, agent);
  if (!entry) throw new Error(`No worktree for agent "${agent}". Create it with "new ${agent}".`);

  const files = changedFiles(entry.path, context.baseBranch);
  const violations = laneViolations(agent, files, context.ownership);

  if (!quiet) {
    console.log(`Agent:    ${agent}`);
    console.log(`Branch:   ${(entry.branch || '').replace('refs/heads/', '')}`);
    console.log(`Worktree: ${entry.path}`);
    console.log(`Base:     ${context.baseBranch}`);
    console.log('');
  }

  if (files.length === 0) {
    if (!quiet) {
      console.log('No changes.');
      console.log('Ownership check: PASS (nothing to check)');
    }
    return { ok: true, files, violations, entry };
  }

  if (!quiet) {
    for (const file of files) {
      console.log(`${violations.includes(file) ? 'FAIL' : 'ok  '} ${file}`);
    }
    console.log('');
  }

  if (violations.length > 0) {
    if (!quiet) {
      console.log(`Ownership check: FAIL (${violations.length} out-of-lane file${violations.length === 1 ? '' : 's'})`);
      console.log('Move these changes to the owning agent, or revert them before merging.');
    }
    return { ok: false, files, violations, entry };
  }

  if (!quiet) console.log(`Ownership check: PASS (${files.length} file${files.length === 1 ? '' : 's'})`);
  return { ok: true, files, violations, entry };
}

function commandCheck(agent) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs check <agent>');
  return checkAgent(agent).ok ? 0 : 1;
}

function projectTestCommand(project) {
  const packagePath = path.join(project, 'package.json');
  if (!fs.existsSync(packagePath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return manifest.scripts?.test ? 'npm test' : null;
  } catch {
    return null;
  }
}

function runProjectTests(project) {
  const command = projectTestCommand(project);
  if (!command) return null;
  console.log('');
  console.log(`Running the project test command in ${project} ...`);
  const result = spawnSync('npm', ['test', '--silent'], {
    cwd: project,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  return result.status === 0;
}

function commandMerge(agent, { skipTests = false } = {}) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs merge <agent> [--skip-tests]');
  const context = activeContext();
  const entries = readWorktrees(context.project);
  const main = findMain(entries, context);
  const entry = findAgentWorktree(entries, agent);
  if (!entry) throw new Error(`No worktree for agent "${agent}".`);

  if (isDirty(entry.path)) {
    throw new Error(`Worktree is dirty: ${entry.path}. Commit or stash before merging.`);
  }

  const check = checkAgent(agent);
  if (!check.ok) {
    throw new Error(`Ownership check failed for ${agent}. Merge aborted.`);
  }

  if (context.mode === 'self') {
    const validate = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'validate.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (validate.status !== 0) {
      throw new Error('Validation failed. Merge aborted.');
    }
  }

  if (isDirty(main.path)) {
    throw new Error('The main checkout is dirty. Commit or move those changes before merging.');
  }

  if (skipTests) {
    console.log('warn project tests skipped (--skip-tests). Run them yourself before pushing.');
  } else {
    const tests = runProjectTests(context.project);
    if (tests === false) {
      throw new Error('Project tests failed on the base checkout. Merge aborted.');
    }
    if (tests === null) console.log('note no "test" script found; skipping the project test run.');
  }

  const merge = runGit(
    ['merge', '--no-ff', `agent/${agent}`, '-m', `merge: agent/${agent}`],
    main.path,
    true,
  );

  if (merge.status !== 0) {
    runGit(['merge', '--abort'], main.path, true);
    const detail = (merge.stderr || merge.stdout || '').trim();
    throw new Error(`Merge failed and was aborted. Resolve it in the agent worktree first.\n${detail}`);
  }

  console.log('');
  console.log(`Merged agent/${agent} into ${context.baseBranch}.`);
  console.log('Next: build, test, then push:');
  console.log(`  git push origin ${context.baseBranch}`);
}

function commandRemove(agent, force) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs remove <agent> [--force]');
  const context = activeContext();
  const entries = readWorktrees(context.project);
  const main = findMain(entries, context);
  const entry = findAgentWorktree(entries, agent);
  if (!entry) throw new Error(`No worktree for agent "${agent}".`);

  if (isDirty(entry.path) && !force) {
    throw new Error(`Worktree is dirty: ${entry.path}. Commit it, or re-run with --force to discard.`);
  }

  const args = ['worktree', 'remove'];
  if (force) args.push('--force');
  args.push(entry.path);
  runGit(args, main.path);

  console.log(`Removed worktree ${entry.path}`);
  console.log(`Branch agent/${agent} still exists. Delete it only after the work is merged:`);
  console.log(`  git branch -d agent/${agent}`);
  console.log(`  git push origin --delete agent/${agent}`);
}

function commandSyncEnv() {
  const context = activeContext();
  const entries = readWorktrees(context.project);
  findMain(entries, context);
  const source = path.join(context.project, '.env.local');
  if (!fs.existsSync(source)) {
    throw new Error(`No .env.local in ${context.project}. Create it from .env.example first.`);
  }

  let copied = 0;
  for (const agent of agentNames()) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) continue;
    fs.copyFileSync(source, path.join(entry.path, '.env.local'));
    copied += 1;
    console.log(`synced .env.local -> ${entry.path}`);
  }
  console.log(`Synced ${copied} worktree${copied === 1 ? '' : 's'}.`);
}

function commandWhere() {
  const context = activeContext();
  printContext(context);
  console.log(`Workspace: ${ROOT}`);
  console.log(`Agents:    ${agentNames().join(', ')}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  try {
    switch (command) {
      case 'list':
        commandList();
        break;
      case 'status':
        commandStatus();
        break;
      case 'bootstrap':
        commandBootstrap();
        break;
      case 'new':
        commandNew(args[1]);
        break;
      case 'check':
        process.exitCode = commandCheck(args[1]);
        break;
      case 'merge':
        commandMerge(args[1], { skipTests: args.includes('--skip-tests') });
        break;
      case 'remove':
        commandRemove(args[1], args.includes('--force'));
        break;
      case 'sync-env':
        commandSyncEnv();
        break;
      case 'where':
        commandWhere();
        break;
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;
      default:
        printHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (entryPoint.toLowerCase() === modulePath.toLowerCase()) {
  main();
}

export { agentNames, checkAgent, ensureWorktree, runGit };

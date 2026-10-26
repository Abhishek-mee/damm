#!/usr/bin/env node
/**
 * DAMM worktree manager.
 *
 * One agent = one worktree = one branch = one ownership lane.
 * The main checkout is the control plane and is never edited by agents.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { OWNERSHIP, laneViolations } from './ownership.mjs';

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

function repoRoot() {
  return normalize(runGit(['rev-parse', '--show-toplevel'], process.cwd()).stdout.trim());
}

function readWorktrees() {
  const raw = runGit(['worktree', 'list', '--porcelain'], process.cwd()).stdout;
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

function findMain(entries) {
  const main = entries.find((entry) => entry.branch === 'refs/heads/main');
  if (!main) {
    throw new Error('No worktree is checked out on branch "main". Restore the main checkout first.');
  }
  return main;
}

function worktreeRoot(mainPath) {
  if (process.env.DAMM_WORKTREE_DIR) {
    return path.resolve(process.env.DAMM_WORKTREE_DIR);
  }
  return path.join(path.dirname(mainPath), `${path.basename(mainPath)}-worktrees`);
}

function agentNames(mainPath) {
  const directory = path.join(mainPath, '.opencode', 'agents');
  if (!fs.existsSync(directory)) return Object.keys(OWNERSHIP);
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

function changedFiles(worktreePath) {
  const files = new Set();

  for (const args of [
    ['diff', '--name-only', '-z'],
    ['diff', '--cached', '--name-only', '-z'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
    ['diff', '--name-only', '-z', 'main...HEAD'],
  ]) {
    const result = runGit(args, worktreePath, true);
    for (const file of splitNul(result.stdout)) files.add(file);
  }

  files.delete('.env.local');
  return [...files].sort();
}

function laneCheck(agent, files) {
  return laneViolations(agent, files);
}

function copyLocalEnv(mainPath, worktreePath) {
  const source = path.join(mainPath, '.env.local');
  if (!fs.existsSync(source)) return false;
  fs.copyFileSync(source, path.join(worktreePath, '.env.local'));
  return true;
}

function printHelp() {
  console.log(`DAMM worktree manager

Usage:
  node scripts/worktree.mjs list
  node scripts/worktree.mjs status
  node scripts/worktree.mjs bootstrap
  node scripts/worktree.mjs new <agent>
  node scripts/worktree.mjs check <agent>
  node scripts/worktree.mjs merge <agent>
  node scripts/worktree.mjs remove <agent> [--force]
  node scripts/worktree.mjs sync-env

Agents: ${Object.keys(OWNERSHIP).join(', ')}

The main checkout is the control plane. Agents work in sibling directories
under ..\\damm-worktrees\\<agent> on branch agent/<agent>.`);
}

function commandList() {
  const entries = readWorktrees();
  const main = findMain(entries);
  const root = worktreeRoot(main.path);

  console.log(`Main:      ${main.path}`);
  console.log(`Worktrees: ${root}`);
  console.log('');
  console.log('AGENT'.padEnd(20), 'BRANCH'.padEnd(28), 'DIRTY'.padEnd(7), 'PATH');
  console.log('-'.repeat(96));

  for (const agent of agentNames(main.path)) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) {
      console.log(agent.padEnd(20), `agent/${agent}`.padEnd(28), 'missing'.padEnd(7), path.join(root, agent));
      continue;
    }
    const dirty = isDirty(entry.path) ? 'dirty' : 'clean';
    console.log(agent.padEnd(20), (entry.branch || '').replace('refs/heads/', '').padEnd(28), dirty.padEnd(7), entry.path);
  }
}

function commandStatus() {
  const entries = readWorktrees();
  const main = findMain(entries);

  for (const agent of agentNames(main.path)) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) {
      console.log(`${agent}: no worktree`);
      continue;
    }

    const dirty = isDirty(entry.path);
    const last = runGit(['log', '-1', '--pretty=%h %s'], entry.path, true).stdout.trim();
    const counts = runGit(['rev-list', '--left-right', '--count', 'main...HEAD'], entry.path, true).stdout.trim();
    const [behind, ahead] = counts.split(/\s+/).map((value) => Number(value) || 0);
    console.log(`${agent}: ${dirty ? 'dirty' : 'clean'} | ahead ${ahead} behind ${behind} | ${last || 'no commits'}`);
    console.log(`  ${entry.path}`);
  }
}

function commandNew(agent) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs new <agent>');
  if (!agentNames(findMain(readWorktrees()).path).includes(agent)) {
    throw new Error(`Unknown agent "${agent}". Run "node scripts/worktree.mjs list" for the roster.`);
  }

  const entries = readWorktrees();
  const main = findMain(entries);
  const root = worktreeRoot(main.path);
  const worktreePath = path.join(root, agent);
  const branch = `agent/${agent}`;

  if (fs.existsSync(worktreePath)) {
    throw new Error(`Worktree already exists: ${worktreePath}`);
  }

  const checkedOut = findAgentWorktree(entries, agent);
  if (checkedOut) {
    throw new Error(`Branch ${branch} is already checked out at ${checkedOut.path}`);
  }

  if (isDirty(main.path)) {
    throw new Error('The main checkout is dirty. Commit or move those changes before creating a worktree.');
  }

  fs.mkdirSync(root, { recursive: true });

  const branchExists =
    runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], main.path, true).status === 0;

  if (branchExists) {
    runGit(['worktree', 'add', worktreePath, branch], main.path);
  } else {
    runGit(['worktree', 'add', '-b', branch, worktreePath, 'main'], main.path);
  }

  const envCopied = copyLocalEnv(main.path, worktreePath);

  console.log(`Created ${agent}`);
  console.log(`  branch:   ${branch}`);
  console.log(`  worktree: ${worktreePath}`);
  console.log(`  env:      ${envCopied ? '.env.local copied' : 'no .env.local found'}`);
  console.log('');
  console.log('Open that folder in OpenCode, select this agent, and work there.');
}

function commandBootstrap() {
  const entries = readWorktrees();
  const main = findMain(entries);
  const root = worktreeRoot(main.path);
  const results = [];

  for (const agent of agentNames(main.path)) {
    if (fs.existsSync(path.join(root, agent))) {
      results.push([agent, 'exists']);
      continue;
    }
    try {
      commandNew(agent);
      results.push([agent, 'created']);
    } catch (error) {
      results.push([agent, `failed: ${error.message}`]);
    }
  }

  console.log('\nBootstrap summary');
  for (const [agent, result] of results) console.log(`  ${agent.padEnd(20)} ${result}`);
}

function commandCheck(agent) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs check <agent>');
  const entries = readWorktrees();
  const entry = findAgentWorktree(entries, agent);
  if (!entry) throw new Error(`No worktree for agent "${agent}". Create it with "new ${agent}".`);

  const files = changedFiles(entry.path);
  const violations = laneCheck(agent, files);

  console.log(`Agent:    ${agent}`);
  console.log(`Branch:   ${(entry.branch || '').replace('refs/heads/', '')}`);
  console.log(`Worktree: ${entry.path}`);
  console.log('');

  if (files.length === 0) {
    console.log('No changes.');
    console.log('Ownership check: PASS (nothing to check)');
    return 0;
  }

  for (const file of files) {
    console.log(`${violations.includes(file) ? 'FAIL' : 'ok  '} ${file}`);
  }

  console.log('');
  if (violations.length > 0) {
    console.log(`Ownership check: FAIL (${violations.length} out-of-lane file${violations.length === 1 ? '' : 's'})`);
    console.log('Move these changes to the owning agent, or revert them before merging.');
    return 1;
  }

  console.log(`Ownership check: PASS (${files.length} file${files.length === 1 ? '' : 's'})`);
  return 0;
}

function commandMerge(agent) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs merge <agent>');
  const entries = readWorktrees();
  const main = findMain(entries);
  const entry = findAgentWorktree(entries, agent);
  if (!entry) throw new Error(`No worktree for agent "${agent}".`);

  if (isDirty(entry.path)) {
    throw new Error(`Worktree is dirty: ${entry.path}. Commit or stash before merging.`);
  }

  const checkStatus = commandCheck(agent);
  if (checkStatus !== 0) {
    throw new Error(`Ownership check failed for ${agent}. Merge aborted.`);
  }

  const validate = spawnSync(process.execPath, [path.join(main.path, 'scripts', 'validate.mjs')], {
    cwd: main.path,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (validate.status !== 0) {
    throw new Error('Validation failed. Merge aborted.');
  }

  if (isDirty(main.path)) {
    throw new Error('The main checkout is dirty. Commit or move those changes before merging.');
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
  console.log(`Merged agent/${agent} into main.`);
  console.log('Next: build, test, then push:');
  console.log('  git push origin main');
}

function commandRemove(agent, force) {
  if (!agent) throw new Error('Usage: node scripts/worktree.mjs remove <agent> [--force]');
  const entries = readWorktrees();
  const main = findMain(entries);
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
  const entries = readWorktrees();
  const main = findMain(entries);
  const source = path.join(main.path, '.env.local');
  if (!fs.existsSync(source)) {
    throw new Error(`No .env.local in ${main.path}. Create it from .env.example first.`);
  }

  let copied = 0;
  for (const agent of agentNames(main.path)) {
    const entry = findAgentWorktree(entries, agent);
    if (!entry) continue;
    fs.copyFileSync(source, path.join(entry.path, '.env.local'));
    copied += 1;
    console.log(`synced .env.local -> ${entry.path}`);
  }
  console.log(`Synced ${copied} worktree${copied === 1 ? '' : 's'}.`);
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
        commandMerge(args[1]);
        break;
      case 'remove':
        commandRemove(args[1], args.includes('--force'));
        break;
      case 'sync-env':
        commandSyncEnv();
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

main();

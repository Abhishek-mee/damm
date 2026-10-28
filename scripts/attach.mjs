#!/usr/bin/env node
/**
 * Attach DAMM to another git project.
 *
 *   npm run attach -- ../my-project
 *   npm run attach -- ../my-project --worktrees core,frontend,qa
 *   npm run attach -- ../my-project --all
 *   npm run attach -- --status
 *   npm run attach -- --detach
 *
 * Attaching never edits the target's tracked files. The agent kit is copied to
 * .opencode/ and DAMM.md, then those paths are added to .git/info/exclude so
 * they stay local. The target's own files are never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { CONFIG, ROOT } from './ownership.mjs';
import { activeContext, detectBaseBranch, defaultWorktreeRoot, isGitRepo, removeLocal, writeLocal } from './context.mjs';
import { installKit, kitState, printKitResult } from './kit.mjs';
import { agentNames, ensureWorktree } from './worktree.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const positional = args.filter((arg) => !arg.startsWith('--'));

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function heading(text) {
  console.log('');
  console.log(text);
  console.log('-'.repeat(text.length));
}

function targetConfig(project) {
  const configPath = path.join(project, 'damm.config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`${configPath} is not valid JSON: ${error.message}`);
  }
}

function showStatus() {
  const context = activeContext();
  heading('DAMM attach status');
  console.log(`mode:      ${context.mode}`);
  console.log(`project:   ${context.project}`);
  console.log(`base:      ${context.baseBranch}`);
  console.log(`worktrees: ${context.worktreeRoot}`);
  console.log(`source:    ${context.source}`);
  if (context.mode === 'attached') {
    const state = kitState(context.project);
    console.log(`kit:       ${state ? `v${state.version}, installed ${state.installedAt}` : 'not installed'}`);
  }
  console.log('');
  console.log('Agents:');
  for (const agent of agentNames()) {
    const lanes = context.ownership[agent] ?? [];
    const label = lanes.length === 0 ? 'read-only' : `${lanes.length} lane pattern(s)`;
    console.log(`  ${agent.padEnd(14)} ${label}`);
  }
}

function detach() {
  const removed = removeLocal();
  console.log(removed ? 'Detached. DAMM now runs against its own repository.' : 'Nothing to detach.');
  console.log('Worktrees and branches created in the attached project were left untouched.');
  console.log('Remove them with git worktree remove <path> when the work is merged.');
}

function normalizeProject(input) {
  const project = path.resolve(process.cwd(), input);
  if (project === ROOT) throw new Error('That is this workspace. Attach a different repository.');
  if (!fs.existsSync(project)) throw new Error(`No such directory: ${project}`);
  if (!isGitRepo(project)) throw new Error(`Not a git repository: ${project}`);
  return project;
}

function attach(input) {
  const project = normalizeProject(input);

  const head = fs.existsSync(path.join(project, '.git', 'HEAD'))
    ? fs.readFileSync(path.join(project, '.git', 'HEAD'), 'utf8').trim()
    : null;
  if (head && !/^ref:\s*refs\/heads\//.test(head)) {
    throw new Error(`${project} has a detached HEAD. Check out the base branch before attaching.`);
  }

  const config = targetConfig(project);
  const agents = config?.agents ?? CONFIG.agents;
  const baseBranch = detectBaseBranch(project);
  const worktreeRoot = config?.worktreeRoot
    ? path.resolve(project, config.worktreeRoot)
    : defaultWorktreeRoot(project);

  const local = writeLocal({
    project,
    baseBranch,
    worktreeRoot,
    agents,
    excludeKit: !flags.has('--no-exclude'),
  });

  heading('Attached');
  console.log(`project:   ${project}`);
  console.log(`base:      ${baseBranch}`);
  console.log(`worktrees: ${worktreeRoot}`);
  console.log(`config:    ${path.join(ROOT, 'damm.local.json')} (gitignored)`);

  heading('Agent kit');
  const kit = installKit(project, { exclude: local.excludeKit });
  printKitResult(kit);

  if (!config) {
    console.log('');
    console.log('note the project has no damm.config.json, so the default lanes apply.');
    console.log('     Copy damm.config.json into the project and edit the lanes to match its layout.');
    console.log('     The next "npm run attach" picks it up automatically.');
  }

  const requested = option('--worktrees');
  const agentsToCreate = flags.has('--all')
    ? agentNames()
    : requested
      ? requested
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

  if (agentsToCreate.length > 0) {
    heading('Worktrees');
    for (const agent of agentsToCreate) {
      try {
        const result = ensureWorktree(agent);
        console.log(`${result.created ? 'created' : 'exists '} ${agent.padEnd(14)} ${result.worktreePath}`);
        if (result.kit) printKitResult(result.kit, { quiet: true });
      } catch (error) {
        console.log(`FAIL    ${agent.padEnd(14)} ${error.message}`);
      }
    }
  }

  heading('Next');
  console.log('1. Create a worktree:        npm run worktree -- new core');
  console.log('2. Open that folder in OpenCode and pick the matching agent.');
  console.log('3. Plan a parallel run:      npm run fanout -- --tasks damm.tasks.json');
  console.log('4. Execute it:               npm run fanout -- --tasks damm.tasks.json --run');
  console.log('5. Merge one branch:         npm run worktree -- merge core');
  console.log('');
  console.log('Docs: docs/ATTACH.md, docs/PARALLEL.md, docs/WORKTREES.md');
}

function main() {
  try {
    if (flags.has('--help') || flags.has('-h')) {
      console.log(`DAMM attach

Usage:
  node scripts/attach.mjs <project> [--worktrees a,b,c] [--all] [--no-exclude]
  node scripts/attach.mjs --status
  node scripts/attach.mjs --detach

Options:
  --worktrees <list>  create worktrees for these agents after attaching
  --all               create all agent worktrees
  --no-exclude        do not add the kit to .git/info/exclude
  --status            show the active project and kit state
  --detach            stop using the attached project (keeps its worktrees)
`);
      return;
    }

    if (flags.has('--status')) {
      showStatus();
      return;
    }

    if (flags.has('--detach')) {
      detach();
      return;
    }

    const input = positional[0];
    if (!input) throw new Error('Usage: node scripts/attach.mjs <project> [--all] [--worktrees a,b,c]');
    attach(input);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();

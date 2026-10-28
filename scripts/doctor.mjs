#!/usr/bin/env node
/**
 * Environment doctor for the DAMM workspace.
 *
 * Answers one question: can this machine run the agent setup right now, and
 * what is the next concrete step? It never prints the API key.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { activeContext, readLocal } from './context.mjs';
import { kitState } from './kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];
const next = [];

function rel(relative) {
  return path.join(ROOT, relative);
}

function exists(relative) {
  return fs.existsSync(rel(relative));
}

function read(relative) {
  return fs.readFileSync(rel(relative), 'utf8');
}

function command(name, args = ['--version'], options = {}) {
  const result = spawnSync(name, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  });
  if (result.error?.code === 'ENOENT') return null;
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim().split(/\r?\n/)[0] || '';
  return result.status === 0 ? output : null;
}

function git(args, allowFailure = false) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (!allowFailure && result.status !== 0) return null;
  return result;
}

function section(title) {
  console.log('');
  console.log(title);
  console.log('-'.repeat(title.length));
}

function line(label, value, state = 'ok') {
  const marker = state === 'ok' ? 'ok  ' : state === 'warn' ? 'warn' : 'FAIL';
  console.log(`${marker} ${label.padEnd(20)} ${value}`);
}

// ---------------------------------------------------------------------------

console.log('DAMM doctor');
console.log(`  root: ${ROOT}`);

section('Runtime');
const nodeMajor = Number(process.versions.node.split('.')[0]);
line('node', `${process.versions.node}`, nodeMajor >= 20 ? 'ok' : 'fail');
if (nodeMajor < 20) problems.push('Node 20 or newer is required.');

const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npm = fs.existsSync(npmCli)
  ? command(process.execPath, [npmCli, '--version'])
  : command(process.platform === 'win32' ? 'npm.cmd' : 'npm');
line('npm', npm || 'not found', npm ? 'ok' : 'warn');
if (!npm) notes.push('npm was not found on PATH; run the scripts with "node scripts/<name>.mjs" instead.');

const gitVersion = command('git');
line('git', gitVersion || 'not found', gitVersion ? 'ok' : 'fail');
if (!gitVersion) problems.push('git is required for worktrees.');

const opencode = command(process.platform === 'win32' ? 'opencode.cmd' : 'opencode', ['--version']);
line('opencode', opencode || 'not found', opencode ? 'ok' : 'warn');
if (!opencode) {
  notes.push('The opencode CLI is not on PATH. The interactive app works without it; `npm run fanout --run` needs it.');
}

const isRepo = git(['rev-parse', '--is-inside-work-tree'])?.status === 0;
if (!isRepo) {
  line('repository', 'not a git repository', 'fail');
  problems.push('Run this from the DAMM git checkout.');
}

section('Workspace');
let context = null;
try {
  context = activeContext();
  line('mode', context.mode, 'ok');
  line('project', context.project, 'ok');
  line('base branch', context.baseBranch, 'ok');
  line('worktrees', context.worktreeRoot, 'ok');
  line('config', context.source, 'ok');

  if (context.mode === 'attached') {
    const state = kitState(context.project);
    line('agent kit', state ? `v${state.version}` : 'not installed', state ? 'ok' : 'warn');
    if (!state) notes.push('The attached project has no agent kit. Re-run: npm run attach -- <project>');
  }
} catch (error) {
  line('workspace', error.message, 'fail');
  problems.push(error.message);
}

if (exists('damm.local.json') && readLocal()?.project) {
  notes.push('damm.local.json is active. "npm run detach" returns DAMM to its own repository.');
}

section('Checkout');
if (isRepo) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], true).stdout.trim();
  const commit = git(['log', '-1', '--pretty=%h %s'], true);
  const dirty = git(['status', '--porcelain'], true).stdout.trim();
  const remote = git(['remote', 'get-url', 'origin'], true);

  const onBase = context ? branch === context.baseBranch : branch === 'main';
  line('branch', branch || 'unborn', onBase ? 'ok' : 'warn');
  line('commit', commit.status === 0 ? commit.stdout.trim() : 'no commits yet', commit.status === 0 ? 'ok' : 'warn');
  line('worktree', dirty ? `${dirty.split(/\r?\n/).length} uncommitted change(s)` : 'clean', dirty ? 'warn' : 'ok');
  line('remote', remote.status === 0 ? remote.stdout.trim() : 'none', remote.status === 0 ? 'ok' : 'warn');

  if (!onBase && branch !== '') {
    notes.push(
      `This checkout is on "${branch}". The control plane should be on "${context?.baseBranch ?? 'main'}"; agents belong in their worktrees.`,
    );
  }
  if (dirty) notes.push('Commit the baseline before creating worktrees; `new` refuses to run on a dirty main checkout.');
}

section('Roster');
const agentFiles = exists('.opencode/agents')
  ? fs.readdirSync(rel('.opencode/agents')).filter((file) => file.endsWith('.md')).sort()
  : [];
const skillDirs = exists('.opencode/skills')
  ? fs
      .readdirSync(rel('.opencode/skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

line('agents', String(agentFiles.length), agentFiles.length === 11 ? 'ok' : 'warn');
line('skills', String(skillDirs.length), skillDirs.length === 17 ? 'ok' : 'warn');

const missingLanes = agentFiles
  .map((file) => file.slice(0, -3))
  .filter((name) => !(context?.ownership ?? {})[name]);
if (missingLanes.length > 0) {
  problems.push(`Agents without ownership lanes: ${missingLanes.join(', ')}`);
}
if (agentFiles.length !== 11) notes.push('The documented roster is 11 agents; run `npm run validate` for details.');

let defaultAgent = 'director';
let defaultModel = 'unknown';
if (exists('.opencode/opencode.jsonc')) {
  const config = read('.opencode/opencode.jsonc');
  defaultAgent = config.match(/"default_agent"\s*:\s*"([^"]+)"/)?.[1] ?? defaultAgent;
  defaultModel = config.match(/"model"\s*:\s*"([^"]+)"/)?.[1] ?? defaultModel;
}
line('default agent', defaultAgent);
line('default model', defaultModel.replace(/^openrouter\//, ''));

section('Credentials');
if (!exists('.env.local')) {
  line('.env.local', 'missing', 'warn');
  notes.push('Copy .env.example to .env.local and add OPENROUTER_API_KEY.');
} else {
  const env = read('.env.local');
  const key = env.match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]?.trim() ?? '';
  const looksValid = key.startsWith('sk-or-v1-') && key.length >= 40;
  line(
    'OPENROUTER_API_KEY',
    key.length === 0 ? 'empty' : looksValid ? 'set' : 'set (unexpected format)',
    key.length === 0 ? 'warn' : looksValid ? 'ok' : 'warn',
  );
  if (key.length === 0) notes.push('Paste the OpenRouter key into .env.local; `npm run check-models` will test every assigned model.');
  else if (!looksValid) notes.push('The key does not look like an OpenRouter key (expected sk-or-v1-...). Double-check it.');
}

section('Worktrees');
if (isRepo && context) {
  const porcelain = git(['worktree', 'list', '--porcelain'], true).stdout;
  const worktrees = [];
  let current = null;
  for (const row of porcelain.split(/\r?\n/)) {
    if (row.startsWith('worktree ')) {
      if (current) worktrees.push(current);
      current = { path: row.slice('worktree '.length) };
    } else if (current && row.startsWith('branch ')) {
      current.branch = row.slice('branch '.length).replace('refs/heads/', '');
    }
  }
  if (current) worktrees.push(current);

  const agents = agentFiles.map((file) => file.slice(0, -3));
  const present = new Set(
    worktrees
      .map((worktree) => worktree.branch)
      .filter((branch) => branch?.startsWith('agent/'))
      .map((branch) => branch.slice('agent/'.length)),
  );
  const missing = agents.filter((agent) => !present.has(agent));

  line('total worktrees', String(worktrees.length), worktrees.length > 1 ? 'ok' : 'warn');
  line(
    'agent worktrees',
    `${agents.length - missing.length}/${agents.length}`,
    missing.length === 0 ? 'ok' : 'warn',
  );
  if (missing.length > 0) {
    notes.push(`Missing worktrees: ${missing.join(', ')}.`);
    next.push('Create the ones you need: npm run worktree -- new <agent>');
  } else {
    next.push('Open the worktree for your next slice and select its agent in OpenCode.');
  }
}

section('Next steps');
if (problems.length > 0) {
  for (const problem of problems) console.log(`  ! ${problem}`);
}
for (const note of notes) console.log(`  - ${note}`);
for (const step of next) console.log(`  > ${step}`);
if (problems.length === 0 && notes.length === 0) console.log('  Ready. Pick the next slice from docs/roadmap.md.');

section('Result');
if (problems.length > 0) {
  console.log(`FAIL  ${problems.length} blocking problem${problems.length === 1 ? '' : 's'}`);
  process.exitCode = 1;
} else {
  console.log('PASS  environment can run the agent workspace');
}

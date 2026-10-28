/**
 * Workspace context.
 *
 * DAMM can run in two modes:
 *   self      — the workspace owns this repository
 *   attached  — the workspace points at another git repository
 *
 * Every script asks this module where the project is, which branch is the
 * base, which worktree root to use, and which lanes apply. That keeps the
 * worktree, fanout, doctor, and attach commands consistent.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, OWNERSHIP, ROOT, resolveWorktreeRoot } from './ownership.mjs';

export const LOCAL_CONFIG = path.join(ROOT, 'damm.local.json');
export const KIT_MARKER = '.damm-kit.json';

function git(args, cwd, allowFailure = false) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) {
    if (allowFailure) return { status: 1, stdout: '', stderr: result.error.message };
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed (${result.status})${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

export function isGitRepo(directory) {
  if (!fs.existsSync(directory)) return false;
  return git(['rev-parse', '--is-inside-work-tree'], directory, true).stdout.trim() === 'true';
}

export function detectBaseBranch(repo) {
  const remoteHead = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], repo, true);
  if (remoteHead.status === 0) {
    const name = remoteHead.stdout.trim().replace(/^origin\//, '');
    if (name) return name;
  }

  for (const candidate of ['main', 'master']) {
    const exists = git(['show-ref', '--verify', '--quiet', `refs/heads/${candidate}`], repo, true);
    if (exists.status === 0) return candidate;
  }

  const head = git(['rev-parse', '--abbrev-ref', 'HEAD'], repo, true).stdout.trim();
  return head && head !== 'HEAD' ? head : 'main';
}

export function readLocal() {
  if (!fs.existsSync(LOCAL_CONFIG)) return null;
  try {
    return JSON.parse(fs.readFileSync(LOCAL_CONFIG, 'utf8'));
  } catch (error) {
    throw new Error(`damm.local.json is not valid JSON: ${error.message}. Delete it or re-run "npm run attach".`);
  }
}

export function defaultWorktreeRoot(project) {
  return path.resolve(project, '..', `${path.basename(project)}-worktrees`);
}

function normalizeLanes(agents) {
  if (!agents || typeof agents !== 'object' || Array.isArray(agents)) {
    throw new Error('damm.local.json: "agents" must be an object of lane arrays.');
  }
  for (const [agent, lanes] of Object.entries(agents)) {
    if (!Array.isArray(lanes) || lanes.some((lane) => typeof lane !== 'string' || !lane)) {
      throw new Error(`damm.local.json: lane for "${agent}" must be an array of non-empty strings.`);
    }
  }
  return agents;
}

/**
 * Resolve the active project.
 *
 * Priority:
 *   1. DAMM_PROJECT environment variable (one-off override)
 *   2. damm.local.json (attach mode)
 *   3. this repository (self mode)
 */
export function activeContext() {
  const override = process.env.DAMM_PROJECT?.trim();

  if (override) {
    const project = path.resolve(ROOT, override);
    if (!isGitRepo(project)) {
      throw new Error(`DAMM_PROJECT is not a git repository: ${project}`);
    }
    return {
      mode: 'attached',
      workspace: ROOT,
      project,
      baseBranch: detectBaseBranch(project),
      worktreeRoot: process.env.DAMM_WORKTREE_DIR
        ? path.resolve(process.env.DAMM_WORKTREE_DIR)
        : defaultWorktreeRoot(project),
      ownership: OWNERSHIP,
      excludeKit: true,
      source: 'DAMM_PROJECT',
    };
  }

  const local = readLocal();
  if (local?.project) {
    const project = path.resolve(ROOT, local.project);
    if (!isGitRepo(project)) {
      throw new Error(
        `damm.local.json points at ${project}, which is not a git repository. Run "npm run detach" or fix the path.`,
      );
    }
    return {
      mode: 'attached',
      workspace: ROOT,
      project,
      baseBranch: local.baseBranch || detectBaseBranch(project),
      worktreeRoot: local.worktreeRoot
        ? path.resolve(project, local.worktreeRoot)
        : defaultWorktreeRoot(project),
      ownership: normalizeLanes(local.agents ?? OWNERSHIP),
      excludeKit: local.excludeKit !== false,
      source: 'damm.local.json',
    };
  }

  return {
    mode: 'self',
    workspace: ROOT,
    project: ROOT,
    baseBranch: detectBaseBranch(ROOT),
    worktreeRoot: resolveWorktreeRoot(ROOT),
    ownership: OWNERSHIP,
    excludeKit: false,
    source: 'damm.config.json',
  };
}

export function writeLocal(data) {
  const relativeProject = path.relative(ROOT, data.project).replace(/\\/g, '/');
  const payload = {
    $comment: 'Local attach state. Gitignored. Created by "npm run attach".',
    project: relativeProject || '.',
    baseBranch: data.baseBranch,
    worktreeRoot: path.relative(data.project, data.worktreeRoot).replace(/\\/g, '/'),
    excludeKit: data.excludeKit !== false,
    agents: data.agents,
    attachedAt: new Date().toISOString(),
  };
  fs.writeFileSync(LOCAL_CONFIG, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function removeLocal() {
  if (!fs.existsSync(LOCAL_CONFIG)) return false;
  fs.rmSync(LOCAL_CONFIG);
  return true;
}

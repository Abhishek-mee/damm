/**
 * Ownership lanes loaded from damm.config.json.
 *
 * One source of truth for the worktree checker, validator, and doctor. A
 * project can replace the lanes without touching the scripts, which is what
 * makes the workspace reusable outside this repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_PATH = path.join(ROOT, 'damm.config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing ${CONFIG_PATH}. Restore damm.config.json.`);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`damm.config.json is not valid JSON: ${error.message}`);
  }

  if (!config.agents || typeof config.agents !== 'object') {
    throw new Error('damm.config.json must define an "agents" object.');
  }

  for (const [agent, lanes] of Object.entries(config.agents)) {
    if (!Array.isArray(lanes) || lanes.some((lane) => typeof lane !== 'string' || !lane)) {
      throw new Error(`damm.config.json: lane for "${agent}" must be an array of non-empty strings.`);
    }
  }

  return config;
}

export const CONFIG = readConfig();
export const OWNERSHIP = CONFIG.agents;

/** Convert a repo-relative glob to an anchored RegExp. Supports *, **, and ?. */
export function globToRegExp(pattern) {
  let regex = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        index += 1;
        if (pattern[index + 1] === '/') {
          index += 1;
          regex += '(?:.*/)?';
        } else {
          regex += '.*';
        }
      } else {
        regex += '[^/]*';
      }
    } else if (char === '?') {
      regex += '[^/]';
    } else {
      regex += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  regex += '$';
  return new RegExp(regex);
}

/** Return files that are outside the agent's lane. */
export function laneViolations(agent, files, lanes = OWNERSHIP) {
  const patterns = lanes[agent];
  if (!patterns) throw new Error(`Unknown agent "${agent}".`);
  const matchers = patterns.map(globToRegExp);
  return files.filter((file) => !matchers.some((matcher) => matcher.test(file)));
}

/** Resolve the worktree root relative to the main checkout. */
export function resolveWorktreeRoot(mainPath) {
  if (process.env.DAMM_WORKTREE_DIR) return path.resolve(process.env.DAMM_WORKTREE_DIR);
  return path.resolve(mainPath, CONFIG.worktreeRoot || '../damm-worktrees');
}

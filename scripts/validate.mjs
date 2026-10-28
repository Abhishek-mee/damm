#!/usr/bin/env node
/**
 * Validate the DAMM agent workspace.
 *
 * Checks the parts that are easy to break by hand:
 *   - JSONC config parses and points at a real primary agent
 *   - every agent has valid frontmatter, a free model, and a lane-safe permission set
 *   - every skill has valid frontmatter and is referenced by at least one agent
 *   - the ownership map, agent files, and roster docs agree
 *   - scripts parse, required files exist, and no secret is committed
 *
 * Exit code 0 = pass, 1 = at least one error.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { OWNERSHIP } from './ownership.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
let checks = 0;

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function check(condition, message) {
  checks += 1;
  if (!condition) fail(message);
  return condition;
}

function relPath(relative) {
  return path.join(ROOT, relative);
}

function exists(relative) {
  return fs.existsSync(relPath(relative));
}

function read(relative) {
  return fs.readFileSync(relPath(relative), 'utf8');
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function listDirectories(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Strip // and block comments plus trailing commas, respecting strings. */
function stripJsonc(text) {
  let output = '';
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, '$1');
}

function parseJsonc(relative) {
  const raw = read(relative);
  return JSON.parse(stripJsonc(raw));
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function splitFrontmatter(relative) {
  const text = read(relative);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return { raw: match[1], body: text.slice(match[0].length) };
}

function parseFrontmatter(raw) {
  const data = { permissions: [] };
  let permission = null;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const top = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (top) {
      permission = null;
      if (top[1] === 'permissions') continue;
      data[top[1]] = unquote(top[2]);
      continue;
    }

    const item = line.match(/^\s*-\s+action:\s*(.+)$/);
    if (item) {
      permission = { action: unquote(item[1]) };
      data.permissions.push(permission);
      continue;
    }

    const property = line.match(/^\s+(resource|effect):\s*(.+)$/);
    if (property && permission) permission[property[1]] = unquote(property[2]);
  }

  return data;
}

/** True when `resource` is the same as, or below, a lane pattern. */
function withinLane(resource, pattern) {
  const normalizedResource = resource.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  if (normalizedResource === normalizedPattern) return true;
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedResource === prefix || normalizedResource.startsWith(`${prefix}/`);
  }
  return false;
}

function isFreeOpenRouterModel(model) {
  if (typeof model !== 'string' || !model.startsWith('openrouter/')) return false;
  if (model === 'openrouter/free') return true;
  if (!model.endsWith(':free')) return false;
  return /^openrouter\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i.test(model);
}

function skillReferences(body) {
  const references = new Set();
  const lines = body.split(/\r?\n/);
  let inSkills = false;

  for (const line of lines) {
    if (/skills?\b/i.test(line) && !line.trim().startsWith('-')) {
      inSkills = true;
      continue;
    }
    if (!inSkills) continue;
    if (!line.trim()) {
      if (references.size > 0) inSkills = false;
      continue;
    }
    if (line.startsWith('#')) {
      inSkills = false;
      continue;
    }
    const match = line.match(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/);
    if (match) references.add(match[1]);
  }

  return references;
}

function walk(directory, visit) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      ['.git', 'node_modules', 'dist', 'build', 'out', 'coverage', '.worktrees', 'worktrees'].includes(
        entry.name,
      )
    ) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, visit);
    else if (entry.isFile()) visit(absolute);
  }
}

function git(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
}

// ---------------------------------------------------------------------------
// Required files
// ---------------------------------------------------------------------------

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'licenses/ECC-LICENSE.txt',
  '.gitignore',
  '.env.example',
  '.opencode/opencode.jsonc',
  'damm.config.json',
  'damm.schema.json',
  'damm.tasks.example.json',
  'docs/AGENTS.md',
  'docs/WORKTREES.md',
  'docs/SETUP.md',
  'docs/ATTACH.md',
  'docs/PARALLEL.md',
  'docs/FAQ.md',
  'docs/UPSTREAM.md',
  'docs/roadmap.md',
  'package.json',
  'scripts/doctor.mjs',
  'scripts/validate.mjs',
  'scripts/check-models.mjs',
  'scripts/worktree.mjs',
  'scripts/ownership.mjs',
  'scripts/context.mjs',
  'scripts/kit.mjs',
  'scripts/attach.mjs',
  'scripts/fanout.mjs',
  'scripts/setup.mjs',
  '.github/workflows/validate.yml',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/dependabot.yml',
];

for (const file of requiredFiles) {
  check(exists(file), `Missing required file: ${file}`);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

let config = null;
try {
  config = parseJsonc('.opencode/opencode.jsonc');
} catch (error) {
  fail(`.opencode/opencode.jsonc does not parse: ${error.message}`);
}

if (config) {
  check(config.$schema === 'https://opencode.ai/config.json', 'Config $schema must be https://opencode.ai/config.json');
  check(typeof config.default_agent === 'string', 'Config default_agent must be set');
  check(isFreeOpenRouterModel(config.model), `Config default model is not a free OpenRouter model: ${config.model}`);

  for (const instruction of config.instructions ?? []) {
    check(exists(instruction), `Config instruction file does not exist: ${instruction}`);
  }

  const permissions = Array.isArray(config.permissions) ? config.permissions : [];
  const deniesEnv = (action) =>
    permissions.some(
      (permission) =>
        permission.action === action &&
        permission.effect === 'deny' &&
        String(permission.resource).includes('.env.local'),
    );
  check(deniesEnv('read'), 'Config must deny reading .env.local');
  check(deniesEnv('edit'), 'Config must deny editing .env.local');
  check(
    permissions.some(
      (permission) =>
        permission.action === 'shell' && permission.effect === 'ask' && permission.resource === 'git push*',
    ),
    'Config must ask before git push',
  );
  check(Boolean(config.providers?.openrouter), 'Config must define the openrouter provider');
}

// ---------------------------------------------------------------------------
// Workspace config
// ---------------------------------------------------------------------------

let workspaceConfig = null;
try {
  workspaceConfig = JSON.parse(read('damm.config.json'));
} catch (error) {
  fail(`damm.config.json does not parse: ${error.message}`);
}

if (workspaceConfig) {
  check(workspaceConfig.version === 1, 'damm.config.json: version must be 1');
  check(
    typeof workspaceConfig.worktreeRoot === 'string' && workspaceConfig.worktreeRoot.length > 0,
    'damm.config.json: worktreeRoot must be a non-empty string',
  );

  const configuredAgents = Object.keys(workspaceConfig.agents ?? {});
  check(configuredAgents.length === 11, `damm.config.json: expected 11 agents, found ${configuredAgents.length}`);

  for (const [agent, lanes] of Object.entries(workspaceConfig.agents ?? {})) {
    check(Array.isArray(lanes), `damm.config.json: lanes for "${agent}" must be an array`);
    for (const lane of lanes ?? []) {
      check(typeof lane === 'string' && lane.length > 0, `damm.config.json: "${agent}" has an empty lane`);
      check(!lane.includes('\\'), `damm.config.json: "${agent}" lane "${lane}" must use forward slashes`);
      check(!path.isAbsolute(lane), `damm.config.json: "${agent}" lane "${lane}" must be repo-relative`);
    }
  }

  check(
    Array.isArray(workspaceConfig.agents?.reviewer) && workspaceConfig.agents.reviewer.length === 0,
    'damm.config.json: reviewer must have an empty lane (read-only)',
  );
}

try {
  const schema = JSON.parse(read('damm.schema.json'));
  check(typeof schema === 'object' && schema !== null, 'damm.schema.json must be a JSON object');
} catch (error) {
  fail(`damm.schema.json does not parse: ${error.message}`);
}

// Code lanes must not overlap: two agents editing the same source file in
// parallel is how work gets lost. Documentation may be shared.
const codePrefixes = ['src/', 'engine/', 'web/', 'shaders/', 'assets/', 'tests/'];
const codeLanes = Object.entries(workspaceConfig?.agents ?? {}).flatMap(([agent, lanes]) =>
  (lanes ?? [])
    .filter((lane) => codePrefixes.some((prefix) => lane.startsWith(prefix)))
    .map((lane) => ({ agent, lane })),
);

for (let first = 0; first < codeLanes.length; first += 1) {
  for (let second = first + 1; second < codeLanes.length; second += 1) {
    const a = codeLanes[first];
    const b = codeLanes[second];
    if (a.agent === b.agent) continue;
    const aPrefix = a.lane.replace(/\*\*.*$/, '');
    const bPrefix = b.lane.replace(/\*\*.*$/, '');
    if (aPrefix.startsWith(bPrefix) || bPrefix.startsWith(aPrefix)) {
      warn(`code lane overlap: ${a.agent} "${a.lane}" and ${b.agent} "${b.lane}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

const agentsDirectory = relPath('.opencode/agents');
const agentFiles = listFiles(agentsDirectory).filter((file) => file.endsWith('.md'));
const agents = new Map();
const referencedSkills = new Set();

for (const file of agentFiles) {
  const name = file.slice(0, -3);
  const relative = path.relative(ROOT, path.join(agentsDirectory, file)).replace(/\\/g, '/');
  const frontmatter = splitFrontmatter(relative);
  if (!frontmatter) {
    fail(`${relative}: missing --- frontmatter ---`);
    continue;
  }

  const data = parseFrontmatter(frontmatter.raw);
  agents.set(name, data);

  check(typeof data.description === 'string' && data.description.length >= 20, `${relative}: description is missing or too short`);
  check(typeof data.description === 'string' && data.description.length <= 1024, `${relative}: description exceeds 1024 characters`);
  check(['primary', 'subagent', 'all'].includes(data.mode), `${relative}: mode must be primary, subagent, or all`);
  check(isFreeOpenRouterModel(data.model), `${relative}: model must be a free OpenRouter model, got "${data.model}"`);
  check(frontmatter.body.trim().length >= 200, `${relative}: prompt body is too short to be useful`);

  if (data.steps !== undefined) {
    const steps = Number(data.steps);
    check(Number.isInteger(steps) && steps > 0 && steps <= 200, `${relative}: steps must be an integer from 1 to 200`);
  }

  check(Array.isArray(data.permissions) && data.permissions.length > 0, `${relative}: permissions must not be empty`);

  const lane = OWNERSHIP[name];
  check(Boolean(lane), `${relative}: no ownership lane in scripts/ownership.mjs`);

  const editDenyAll = data.permissions.some(
    (permission) => permission.action === 'edit' && permission.resource === '*' && permission.effect === 'deny',
  );
  check(editDenyAll, `${relative}: must start with edit "*" deny`);

  for (const permission of data.permissions) {
    if (!permission.resource || !permission.effect) {
      fail(`${relative}: permission entry is missing resource or effect: ${JSON.stringify(permission)}`);
      continue;
    }
    if (permission.action === 'edit' && permission.effect === 'allow' && lane) {
      const covered = lane.some((pattern) => withinLane(permission.resource, pattern));
      check(covered, `${relative}: edit allow "${permission.resource}" is outside the ${name} lane`);
    }
  }

  const editAllows = data.permissions.filter(
    (permission) => permission.action === 'edit' && permission.effect === 'allow',
  );
  if (name === 'reviewer') {
    check(editAllows.length === 0, `${relative}: reviewer must be read-only (found an edit allow)`);
  } else {
    check(editAllows.length > 0, `${relative}: agent has no editable path`);
  }

  const references = skillReferences(frontmatter.body);
  check(references.size > 0, `${relative}: does not load any skill`);
  for (const skill of references) {
    referencedSkills.add(skill);
    check(exists(`.opencode/skills/${skill}/SKILL.md`), `${relative}: references missing skill "${skill}"`);
  }
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

const skillsDirectory = relPath('.opencode/skills');
const skillDirectories = listDirectories(skillsDirectory);
const skills = new Map();

for (const skill of skillDirectories) {
  const relative = `.opencode/skills/${skill}/SKILL.md`;
  if (!exists(relative)) {
    fail(`Missing ${relative}`);
    continue;
  }

  const frontmatter = splitFrontmatter(relative);
  if (!frontmatter) {
    fail(`${relative}: missing --- frontmatter ---`);
    continue;
  }

  const data = parseFrontmatter(frontmatter.raw);
  skills.set(skill, data);

  check(typeof data.name === 'string' && data.name.length > 0, `${relative}: name is required`);
  check(typeof data.name === 'string' && data.name.length <= 64, `${relative}: name exceeds 64 characters`);
  check(typeof data.description === 'string' && data.description.length >= 40, `${relative}: description is too short`);
  check(typeof data.description === 'string' && data.description.length <= 1024, `${relative}: description exceeds 1024 characters`);
  check(frontmatter.body.trim().length >= 200, `${relative}: skill body is too short to be useful`);
}

// Every declared skill should be reachable from at least one agent.
for (const skill of skillDirectories) {
  check(referencedSkills.has(skill), `Skill "${skill}" is not loaded by any agent`);
}

// ---------------------------------------------------------------------------
// Roster consistency
// ---------------------------------------------------------------------------

const agentNames = [...agents.keys()].sort();
const ownershipNames = Object.keys(OWNERSHIP).sort();

check(
  JSON.stringify(agentNames) === JSON.stringify(ownershipNames),
  `Agent files and ownership lanes differ.\n  agents:    ${agentNames.join(', ')}\n  ownership: ${ownershipNames.join(', ')}`,
);

check(agentNames.length === 11, `Expected 11 agents, found ${agentNames.length}`);
check(skillDirectories.length === 17, `Expected 17 skills, found ${skillDirectories.length}`);

const primaryAgents = agentNames.filter((name) => agents.get(name).mode === 'primary');
check(primaryAgents.length === 1, `Expected exactly one primary agent, found: ${primaryAgents.join(', ') || 'none'}`);
if (typeof config?.default_agent === 'string') {
  check(agents.has(config.default_agent), `Config default_agent "${config.default_agent}" has no agent file`);
  check(
    agents.get(config.default_agent)?.mode === 'primary',
    `Config default_agent "${config.default_agent}" must be primary`,
  );
}

const directorModel = agents.get('director')?.model;
check(
  !directorModel || !config?.model || directorModel === config.model,
  `Config model (${config?.model}) and director model (${directorModel}) must match`,
);

for (const rosterFile of ['README.md', 'docs/AGENTS.md']) {
  if (!exists(rosterFile)) continue;
  const text = read(rosterFile);
  for (const name of agentNames) {
    check(text.includes(`\`${name}\``), `${rosterFile}: agent "${name}" is missing from the roster`);
  }
}

if (exists('docs/AGENTS.md')) {
  const matrix = read('docs/AGENTS.md');
  for (const skill of skillDirectories) {
    check(matrix.includes(`\`${skill}\``), `docs/AGENTS.md: skill "${skill}" is missing from the matrix`);
  }
}

// The old roster must not leak back into the docs.
const retiredAgents = ['engine-architect', 'renderer', 'gameplay', 'audio'];
for (const file of ['README.md', 'AGENTS.md', 'docs/AGENTS.md', 'docs/WORKTREES.md', 'damm.config.json']) {
  if (!exists(file)) continue;
  const text = read(file);
  for (const retired of retiredAgents) {
    check(!text.includes(`\`${retired}\``), `${file}: still references the retired agent "${retired}"`);
  }
}

// The example task file must point at real agents.
if (exists('damm.tasks.example.json')) {
  try {
    const example = JSON.parse(read('damm.tasks.example.json'));
    for (const task of example.tasks ?? []) {
      check(agents.has(task.agent), `damm.tasks.example.json: unknown agent "${task.agent}"`);
    }
  } catch (error) {
    fail(`damm.tasks.example.json does not parse: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

const scriptFiles = listFiles(relPath('scripts')).filter((file) => file.endsWith('.mjs'));
for (const script of scriptFiles) {
  const result = spawnSync(process.execPath, ['--check', relPath(`scripts/${script}`)], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  check(result.status === 0, `scripts/${script} has a syntax error: ${(result.stderr || '').trim()}`);
}

check(
  exists('scripts/worktree.mjs') && read('scripts/worktree.mjs').includes('ownership.mjs'),
  'scripts/worktree.mjs must import the shared ownership map',
);

// ---------------------------------------------------------------------------
// Environment and secrets
// ---------------------------------------------------------------------------

if (exists('.env.example')) {
  const example = read('.env.example');
  check(/^OPENROUTER_API_KEY=/m.test(example), '.env.example must define OPENROUTER_API_KEY');
  check(
    !/^OPENROUTER_API_KEY=.+$/m.test(example),
    '.env.example must not contain a real OPENROUTER_API_KEY value',
  );
}

const gitignore = read('.gitignore');
check(/\.env\.\*/.test(gitignore), '.gitignore must ignore .env.* files');
check(/!\.env\.example/.test(gitignore), '.gitignore must keep .env.example');
check(/damm\.local\.json/.test(gitignore), '.gitignore must ignore damm.local.json');
check(/damm\.tasks\.json/.test(gitignore), '.gitignore must ignore damm.tasks.json');
check(/\.damm\//.test(gitignore), '.gitignore must ignore .damm/');

const trackedLocal = git(['ls-files', '--error-unmatch', 'damm.local.json']);
const trackedEnv = git(['ls-files', '--error-unmatch', '.env.local']);
const isGitRepo = git(['rev-parse', '--is-inside-work-tree']).status === 0;
if (!isGitRepo) {
  warn('Not a git repository; skipping the .env.local tracking check');
} else {
  if (trackedEnv.status === 0) fail('.env.local is tracked by git. Remove it from the index; never commit keys.');
  if (trackedLocal.status === 0) {
    fail('damm.local.json is tracked by git. It is local attach state; remove it from the index.');
  }
}

if (exists('.env.local')) {
  const local = read('.env.local');
  const key = local.match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]?.trim() ?? '';
  if (key.length === 0) warn('.env.local exists but OPENROUTER_API_KEY is empty; check-models will not run');
} else {
  warn('.env.local does not exist yet; copy .env.example and add the key');
}

const secretPatterns = [
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9]{24,}/ },
  { name: 'generic sk- key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'GitLab token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
];

walk(ROOT, (absolute) => {
  const relative = path.relative(ROOT, absolute).replace(/\\/g, '/');
  if (relative === '.env.local' || relative.endsWith('/.env.local')) return;

  const stats = fs.statSync(absolute);
  if (stats.size > 2 * 1024 * 1024) return;

  const buffer = fs.readFileSync(absolute);
  if (buffer.includes(0)) return;
  const text = buffer.toString('utf8');

  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(text)) fail(`${relative}: looks like it contains a ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const mode = isGitRepo ? git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout?.trim() : '';
console.log(`DAMM validation`);
console.log(`  root:   ${ROOT}`);
console.log(`  branch: ${mode || 'not a git repository'}`);
console.log(`  agents: ${agentNames.length}, skills: ${skillDirectories.length}`);
console.log('');

for (const warning of warnings) console.log(`warn  ${warning}`);
if (warnings.length > 0) console.log('');

if (errors.length === 0) {
  console.log(`PASS  ${checks} checks, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
  process.exitCode = 0;
} else {
  for (const error of errors) console.log(`FAIL  ${error}`);
  console.log('');
  console.log(`FAIL  ${errors.length} error${errors.length === 1 ? '' : 's'}, ${checks} checks`);
  process.exitCode = 1;
}

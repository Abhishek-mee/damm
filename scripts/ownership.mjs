/**
 * Single source of truth for agent ownership lanes.
 *
 * Both the worktree checker and the validator import this map, so a lane can
 * never drift between the rules in AGENTS.md, the agent frontmatter, and the
 * pre-merge check.
 */
export const OWNERSHIP = {
  director: [
    'docs/**',
    'README.md',
    'AGENTS.md',
    '.github/**',
    'THIRD_PARTY_NOTICES.md',
    'LICENSE',
    'licenses/**',
  ],
  'engine-architect': [
    'engine/**',
    'src/core/**',
    'src/platform/**',
    'CMakeLists.txt',
    'cmake/**',
    'third_party/**',
    'tests/engine/**',
  ],
  renderer: ['src/render/**', 'shaders/**', 'assets/shaders/**', 'tests/render/**'],
  gameplay: [
    'src/game/**',
    'src/input/**',
    'src/physics/**',
    'assets/data/**',
    'tests/game/**',
  ],
  audio: ['src/audio/**', 'assets/audio/**', 'tests/audio/**'],
  tools: ['tools/**', 'assets/tools/**', 'docs/tools/**'],
  designer: ['docs/design/**', 'assets/design/**', 'data/**'],
  qa: ['tests/**', 'docs/qa/**'],
  reviewer: [],
  performance: ['benchmarks/**', 'profiling/**', 'docs/perf/**'],
  docs: ['docs/**', 'README.md'],
};

/**
 * Convert a repo-relative glob to an anchored RegExp.
 * Supports `*`, `**`, and `?`. Kept in sync with the matcher in worktree.mjs.
 */
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
export function laneViolations(agent, files) {
  const patterns = OWNERSHIP[agent];
  if (!patterns) throw new Error(`Unknown agent "${agent}".`);
  const matchers = patterns.map(globToRegExp);
  return files.filter((file) => !matchers.some((matcher) => matcher.test(file)));
}

# Changelog

User-visible changes to the DAMM workspace. The format follows Keep a Changelog; versions follow SemVer once the workspace is published.

## [0.2.0] - 2026-10-28

### Added

- `npm run attach -- <project>` installs the agent kit into any git repository and points every worktree command at it.
- `npm run detach` returns the workspace to its own repository.
- `npm run fanout` runs 2–4 agents in parallel from a task file, dry-run by default, with per-task logs and a lane check after each run.
- `damm.config.json` is the single source of truth for lanes and the worktree root.
- `scripts/context.mjs` resolves self vs attached mode, base branch, and worktree root.
- `scripts/kit.mjs` installs agents, skills, and `DAMM.md` without overwriting existing files, and keeps the kit out of git history through `.git/info/exclude`.
- `docs/SETUP.md`, `docs/ATTACH.md`, `docs/PARALLEL.md`, `docs/FAQ.md`.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, this changelog.
- `examples/game/` with the C++/SDL3/OpenGL mapping.

### Changed

- DAMM is now a general multi-agent software studio. Game development is an example, not the product.
- Agent roster renamed to `director`, `architect`, `frontend`, `core`, `media`, `tools`, `designer`, `qa`, `reviewer`, `performance`, `docs`.
- Skills renamed and rewritten for any software project.
- `worktree.mjs` uses the detected base branch, not a hard-coded `main`.
- `merge` runs the project's `test` script when one exists, and refuses a dirty base checkout.
- `doctor` reports attach mode, kit state, and whether the OpenCode CLI is available.
- `validate` checks the workspace config, schema, code-lane overlap, retired agent names, and the example task file.

### Removed

- The game-specific README and banner copy.
- `docs/CPP_STACK.md` and `docs/design/GDD.md` moved to `examples/game/`.
- The C++ toolchain section in `doctor`.

## [0.1.0] - 2026-10-27

### Added

- Initial workspace: 11 agents, 17 skills, free OpenRouter models, worktrees, ownership checks, CI, and one-command setup.

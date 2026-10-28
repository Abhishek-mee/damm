# Attach DAMM to your project

DAMM is a workspace, not a template you copy. Attaching points the same agents, skills, lanes, and worktree tooling at **your** repository.

```bash
npm run attach -- ../my-project
```

## What attach does

1. Verifies the target is a git repository with a checked-out branch.
2. Reads `damm.config.json` from the target if it exists; otherwise uses the default lanes.
3. Writes `damm.local.json` in the DAMM workspace (gitignored).
4. Copies the agent kit into the target:
   - `.opencode/agents/*.md`
   - `.opencode/skills/*/SKILL.md`
   - `DAMM.md` (the rules every agent reads)
5. Adds those paths to the target's `.git/info/exclude`, so the kit stays local and never appears in a commit.
6. Optionally creates worktrees with `--worktrees` or `--all`.

The target's own files are **never overwritten**. If a file already exists with different content, attach reports it as a conflict and leaves it alone.

## The first run

```bash
cd ~/code/damm
npm run attach -- ../my-project
```

```text
Attached
--------
project:   /home/you/code/my-project
base:      main
worktrees: /home/you/code/my-project-worktrees
config:    /home/you/code/damm/damm.local.json (gitignored)

Agent kit
---------
kit  37 copied, 0 unchanged, 0 conflict(s)
     kit paths added to .git/info/exclude (local only)
```

Then:

```bash
npm run worktree -- new core
npm run worktree -- list
```

Every worktree command now runs against `../my-project`. `npm run doctor` shows the active mode and project.

## Lanes for your project

The default lanes assume a layout like:

```text
src/core/       src/domain/      src/services/    src/app/
src/frontend/   src/ui/          web/             shaders/
src/media/      assets/          tests/           docs/
engine/         scripts/         tools/           benchmarks/
```

If your project uses different paths, put a `damm.config.json` in the target root and edit the lanes:

```json
{
  "version": 1,
  "worktreeRoot": "../my-project-worktrees",
  "agents": {
    "director": ["README.md", "docs/roadmap.md"],
    "architect": ["packages/core/**", "build/**", "docs/decisions/**"],
    "frontend": ["apps/web/**", "packages/ui/**"],
    "core": ["packages/domain/**", "packages/api/**"],
    "media": ["packages/media/**", "assets/**"],
    "tools": [".github/**", "scripts/**", "infra/**"],
    "designer": ["docs/design/**", "design/**"],
    "qa": ["tests/e2e/**", "tests/fixtures/**"],
    "reviewer": [],
    "performance": ["benchmarks/**", "profiling/**"],
    "docs": ["docs/**", "README.md"]
  }
}
```

Then re-run attach. The lanes are validated on the next `npm run validate` in the workspace, and every `check`/`merge` uses them.

Rules for a good lane map:

- Every path has exactly one code owner.
- No lane contains a build output directory.
- `reviewer` stays empty.
- Secrets (`.env*`, keys) are never in a lane.
- Docs may be shared, but `docs/roadmap.md` has one owner.

## The agent kit is local

The kit is excluded through `.git/info/exclude`, not `.gitignore`, so:

- `git status` stays clean
- the target's history is untouched
- `git clone` of the target does not carry DAMM
- deleting the kit is one `rm -rf .opencode/agents .opencode/skills DAMM.md`

If you **want** the kit in your history, commit it explicitly:

```bash
git add -f .opencode DAMM.md
```

Then remove the exclude block from `.git/info/exclude` and re-run attach without `--no-exclude`.

## Worktrees

```bash
npm run attach -- ../my-project --worktrees core,frontend,qa
```

or later:

```bash
npm run worktree -- new core
```

Layout:

```text
../my-project/                  main checkout
../my-project-worktrees/core/   agent/core
../my-project-worktrees/qa/     agent/qa
```

Each worktree gets its own copy of the kit because the kit is not tracked. That is why `new` installs it automatically in attached mode.

## Merge

```bash
npm run worktree -- check core
npm run worktree -- merge core
```

`merge` runs the ownership check, refuses a dirty base checkout, runs `npm test` if the target has a test script, then merges with `--no-ff`. It never pushes.

Use `--skip-tests` only when you have already run them and say so in the handoff.

## Detach

```bash
npm run detach
```

This deletes `damm.local.json`. It does not remove the target's worktrees, branches, or kit. Clean those up deliberately:

```bash
git -C ../my-project worktree list
git -C ../my-project worktree remove ../my-project-worktrees/core
git -C ../my-project branch -d agent/core
```

## Safety properties

- Attach refuses a detached HEAD.
- Attach never edits tracked files.
- Attach never overwrites an existing kit file.
- Merge refuses a dirty worktree, a dirty base checkout, a lane violation, and a failing test command.
- A failed fanout task is reported, never merged.

## Troubleshooting

### `damm.local.json points at ... which is not a git repository`

The path moved or the drive is not mounted. Run `npm run detach` and attach again.

### The target already has `.opencode/agents`

Attach skips files that differ and reports conflicts. Rename your file, or remove it if you want the DAMM version.

### The lane check fails on a file you expected to own

The target is using the default lanes. Add or edit `damm.config.json` in the target and re-run attach.

### `merge` says the base checkout is dirty

Commit or stash the target's main checkout. A merge into a dirty tree is how work gets lost.

# Worktrees: parallel agents without overwrites

## Why

Eleven agents editing one checkout will collide: one agent's format-on-save can revert another's work, `git checkout` changes everyone's files, and a bad merge can erase a day of progress.

DAMM gives every agent:

- its own **directory**
- its own **branch** (`agent/<name>`)
- its own **lane** (enforced by edit permissions and a pre-merge check)
- its own **`.env.local` copy** (gitignored)

The main checkout is the control plane. It stays clean.

## Layout

```text
<project>/                         main checkout, base branch
<project>-worktrees/               all agent checkouts
├── director/                      branch agent/director
├── architect/                     branch agent/architect
├── frontend/                      branch agent/frontend
├── core/                          branch agent/core
├── media/                         branch agent/media
├── tools/                         branch agent/tools
├── designer/                      branch agent/designer
├── qa/                            branch agent/qa
├── reviewer/                      branch agent/reviewer
├── performance/                   branch agent/performance
└── docs/                          branch agent/docs
```

Worktrees are siblings, not nested inside the repo. Nested worktrees confuse file scanners and OpenCode's project discovery.

## Using DAMM on your own project

```bash
# from your DAMM checkout
npm run attach -- ../my-project
```

`attach` writes a gitignored `damm.local.json`, installs the agent kit into the target, and points every later command at that project. Then:

```bash
npm run worktree -- new core
npm run worktree -- list
```

Every worktree command now runs against `../my-project`. To go back to DAMM itself:

```bash
npm run detach
```

See [`ATTACH.md`](ATTACH.md) for the full flow, including lanes for your project.

## Commands

Run from the main checkout or any worktree:

```bash
npm run worktree -- list
npm run worktree -- status
npm run worktree -- new <agent>
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
npm run worktree -- remove <agent>
npm run worktree -- sync-env
```

### `new`

```bash
npm run worktree -- new core
```

Creates:

- directory `<project>-worktrees/core`
- branch `agent/core` from the base branch
- a copy of `.env.local` if it exists
- the agent kit in the worktree when DAMM is attached

It refuses to run if the directory or branch already exists, or if the main checkout is dirty.

### `check`

```bash
npm run worktree -- check core
```

Reads the dirty/committed diff in the worktree and verifies every changed path is inside the agent's lane. A lane violation blocks merging. This is the safety net behind the agent's edit permissions.

### `merge`

```bash
npm run worktree -- merge core
```

Runs, in order:

1. the ownership check
2. `npm run validate` (DAMM workspace only)
3. a clean-main check
4. `git merge --no-ff agent/<agent>`

It does **not** push. Review the merge, run the build, then push manually.

### `remove`

```bash
npm run worktree -- remove core
```

Refuses to remove a dirty worktree. Use `--force` only after confirming the work is merged or discarded.

### `sync-env`

Copies the current `.env.local` into every agent worktree. Use this after rotating the key. The file is never staged.

## The daily loop

```text
1. director picks the next slice
2. director creates/updates the task in docs/roadmap.md
3. agent worktree pulls the base branch:
      git fetch origin
      git merge origin/main
4. agent works only in its lane
5. agent builds and tests
6. agent commits and pushes:
      git add <files>
      git commit -m "type(scope): why"
      git push -u origin agent/<agent>
7. agent reports the handoff
8. director checks and merges
9. human reviews the merge and runs the build
```

## Ownership lanes

The source of truth is `damm.config.json`. The table below is a summary; if they disagree, the config wins and validation fails.

| Agent | Allowed paths |
| --- | --- |
| `director` | repo root docs, `docs/roadmap.md`, `docs/AGENTS.md`, `.github/**`, `damm.config.json` |
| `architect` | `engine/**`, `src/platform/**`, `CMakeLists.txt`, `CMakePresets.json`, `cmake/**`, `third_party/**`, `docs/architecture/**`, `docs/decisions/**`, `tests/architecture/**` |
| `frontend` | `src/frontend/**`, `src/ui/**`, `web/**`, `shaders/**`, `assets/ui/**`, `tests/frontend/**` |
| `core` | `src/core/**`, `src/domain/**`, `src/services/**`, `src/app/**`, `tests/core/**` |
| `media` | `src/media/**`, `assets/media/**`, `assets/audio/**`, `tests/media/**` |
| `tools` | `.github/**`, `scripts/**`, `tools/**`, `docker/**`, `deploy/**`, `Dockerfile*`, `tests/infra/**`, `tests/tools/**` |
| `designer` | `docs/design/**`, `design/**`, `assets/design/**` |
| `qa` | `tests/e2e/**`, `tests/fixtures/**`, `tests/helpers/**`, `docs/qa/**` |
| `reviewer` | read-only |
| `performance` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | `docs/**`, `README.md` |

Shared files (build files, `docs/roadmap.md`, `README.md`) have one owner. Everyone else requests a change through the owner.

## Conflict rules

- **Never** resolve a conflict by deleting the other agent's work.
- If two agents need the same file, the owner makes the change; the other agent supplies the exact patch or requirement.
- Build files are owned by `architect`. Other agents send the target/source list they need.
- `docs/roadmap.md` is owned by `director`.
- If a merge conflicts, the **agent who owns the file** resolves it, then the director re-runs `check` and `merge`.
- Do not force-push shared branches.

## Recovery

### Worktree already exists

```bash
npm run worktree -- list
```

Use the existing directory. Do not delete it to "start clean" unless the work is merged.

### Branch already checked out

Git allows a branch in only one worktree. If `agent/core` is checked out in `<project>-worktrees/core`, use that directory. If it is stale, remove the stale worktree first.

### Dirty worktree blocks removal

Commit or stash the work, or explicitly discard it:

```bash
npm run worktree -- remove core --force
```

`--force` deletes uncommitted changes. It is never the first option.

### Main checkout has changes

The merge script refuses to run. Move the changes into a worktree or commit them. The main checkout is not a scratchpad.

### Agent edited the wrong lane

The check fails at merge. Revert the out-of-lane files in the agent worktree, or ask the lane owner to make the change, then re-run the check.

### Renamed an agent

Git cannot rename a branch that is checked out. Create the new worktree first, then remove the old one after its work is merged.

## Remote branches

Pushing `agent/<name>` backs up the work and lets the human inspect it on GitHub. Worktree directories themselves are local and are not pushed.

After a merge, the branch can stay for history or be deleted:

```bash
git branch -d agent/core
git push origin --delete agent/core
```

Do this only after the merge is on the base branch and the worktree is removed.

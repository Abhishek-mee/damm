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
D:\hackclub\damm\                         main checkout, branch main
D:\hackclub\damm-worktrees\               all agent checkouts
├── director\                             branch agent/director
├── engine-architect\                     branch agent/engine-architect
├── renderer\                             branch agent/renderer
├── gameplay\                             branch agent/gameplay
├── audio\                                branch agent/audio
├── tools\                                branch agent/tools
├── designer\                             branch agent/designer
├── qa\                                   branch agent/qa
├── reviewer\                             branch agent/reviewer
├── performance\                          branch agent/performance
└── docs\                                 branch agent/docs
```

Worktrees are siblings, not nested inside the repo. Nested worktrees confuse file scanners and OpenCode's project discovery.

## Commands

Run from the main checkout or any worktree:

```powershell
npm run worktree -- list
npm run worktree -- status
npm run worktree -- new <agent>
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
npm run worktree -- remove <agent>
npm run worktree -- sync-env
```

### `new`

```powershell
npm run worktree -- new gameplay
```

Creates:

- directory `..\damm-worktrees\gameplay`
- branch `agent/gameplay` from `main`
- a copy of `.env.local` if it exists

It refuses to run if the directory or branch already exists.

### `check`

```powershell
npm run worktree -- check gameplay
```

Reads the dirty/committed diff in the worktree and verifies every changed path is inside the agent's lane. A lane violation blocks merging. This is the safety net behind the agent's edit permissions.

### `merge`

```powershell
npm run worktree -- merge gameplay
```

Runs, in order:

1. the ownership check
2. `npm run validate`
3. a clean-main check
4. `git merge --no-ff agent/<agent>`

It does **not** push. Review the merge, run the build, then push manually.

### `remove`

```powershell
npm run worktree -- remove gameplay
```

Refuses to remove a dirty worktree. Use `--force` only after confirming the work is merged or discarded.

### `sync-env`

Copies the current `.env.local` into every agent worktree. Use this after rotating the key. The file is never staged.

## The daily loop

```text
1. director picks the next slice
2. director creates/updates the task in docs/roadmap.md
3. agent worktree pulls main:
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

| Agent | Allowed paths |
| --- | --- |
| `director` | `docs/**`, `README.md`, `AGENTS.md`, `.github/**`, `THIRD_PARTY_NOTICES.md`, `LICENSE` |
| `engine-architect` | `engine/**`, `src/core/**`, `src/platform/**`, `CMakeLists.txt`, `cmake/**`, `third_party/**`, `tests/engine/**` |
| `renderer` | `src/render/**`, `shaders/**`, `assets/shaders/**`, `tests/render/**` |
| `gameplay` | `src/game/**`, `src/input/**`, `src/physics/**`, `assets/data/**`, `tests/game/**` |
| `audio` | `src/audio/**`, `assets/audio/**`, `tests/audio/**` |
| `tools` | `tools/**`, `assets/tools/**`, `docs/tools/**` |
| `designer` | `docs/design/**`, `assets/design/**`, `data/**` |
| `qa` | `tests/**`, `docs/qa/**` |
| `reviewer` | read-only |
| `performance` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | `docs/**`, `README.md` |

Shared files (`CMakeLists.txt`, `docs/roadmap.md`, `README.md`) have one owner. Everyone else requests a change through the director.

## Conflict rules

- **Never** resolve a conflict by deleting the other agent's work.
- If two agents need the same file, the owner makes the change; the other agent supplies the exact patch or requirement.
- `CMakeLists.txt` is owned by `engine-architect`. Other agents send the target/source list they need.
- `docs/roadmap.md` is owned by `director`.
- If a merge conflicts, the **agent who owns the file** resolves it, then the director re-runs `check` and `merge`.
- Do not force-push shared branches.

## Recovery

### Worktree already exists

```powershell
npm run worktree -- list
```

Use the existing directory. Do not delete it to "start clean" unless the work is merged.

### Branch already checked out

Git allows a branch in only one worktree. If `agent/gameplay` is checked out in `damm-worktrees\gameplay`, use that directory. If it is stale, remove the stale worktree first.

### Dirty worktree blocks removal

Commit or stash the work, or explicitly discard it:

```powershell
npm run worktree -- remove gameplay --force
```

`--force` deletes uncommitted changes. It is never the first option.

### Main checkout has changes

The merge script refuses to run. Move the changes into a worktree or commit them. The main checkout is not a scratchpad.

### Agent edited the wrong lane

The check fails at merge. Revert the out-of-lane files in the agent worktree, or ask the lane owner to make the change, then re-run the check.

## Remote branches

Pushing `agent/<name>` backs up the work and lets the human inspect it on GitHub. Worktree directories themselves are local and are not pushed.

After a merge, the branch can stay for history or be deleted:

```powershell
git branch -d agent/gameplay
git push origin --delete agent/gameplay
```

Do this only after the merge is on `main` and the worktree is removed.

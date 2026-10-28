---
name: Git Worktree Workflow
description: Isolate each agent in its own git worktree and branch, stay inside an ownership lane, and merge only after checks pass. Use when starting work, syncing the base branch, committing, handing off, or resolving a conflict.
metadata:
  origin: DAMM
---

# Git Worktree Workflow

## Non-negotiables

- One agent = one worktree = one branch `agent/<name>`.
- The project's main checkout is the control plane. Do not code there.
- Never edit another agent's worktree.
- Never force-push a shared branch.
- Never resolve a conflict by deleting the other side.

## Start

```bash
git rev-parse --show-toplevel
git branch --show-current
```

Expected:

```text
<project-parent>/<project>-worktrees/<agent>
agent/<agent>
```

If you are on the base branch (`main` or `master`), stop and ask the human to open the correct worktree.

## Sync with the base branch

```bash
git fetch origin
git merge origin/main
```

Replace `main` with the project's base branch. Resolve conflicts in your lane. If the conflict is in a file you do not own, ask the owner.

## Work

- Read `DAMM.md` and your agent file.
- Load your skills.
- Stay inside your lane.
- Build and test before committing.

## Parallel work

- One OpenCode session per worktree.
- Two to four agents at once is the practical limit for free models.
- Never let two agents edit the same shared file. Split it or assign an owner.
- Merge one branch at a time and rebuild after each merge.

## Commit

```bash
git status
git diff
git add <only your files>
git commit -m "type(scope): why"
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `chore`.

Good: `fix(auth): reject expired tokens at the boundary`
Bad: `update files`

Do not commit:

- `.env.local` or any key
- build output
- absolute local paths
- unrelated formatting churn
- the generated `.opencode/`, `DAMM.md`, or `.damm/` kit

## Push

```bash
git push -u origin agent/<agent>
```

The human may review the branch on GitHub. Worktree directories are local and are not pushed.

## Handoff

```text
Branch: agent/<name>
Worktree: <project-parent>/<project>-worktrees/<name>
Changed: <files>
Built: <command> -> pass/fail
Tested: <command> -> pass/fail
Risks: <known issues>
Next: <one step>
```

## Integrate

The director runs from the DAMM workspace:

```bash
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
```

The script finds the project's main worktree and merges there. It refuses if:

- the agent worktree is dirty
- the ownership check fails
- `npm run validate` fails
- the project's main checkout is dirty

## Conflict recovery

1. Stop.
2. Identify the file owner.
3. Read both intents.
4. Re-apply the smaller change on top of the base branch.
5. Rebuild and retest.
6. Re-run check + merge.

If unsure, ask the human. A lost commit is worse than a delayed merge.

## Cleanup

After the merge is on the base branch and verified:

```bash
npm run worktree -- remove <agent>
git branch -d agent/<agent>
git push origin --delete agent/<agent>
```

Never remove a dirty worktree without explicit approval.

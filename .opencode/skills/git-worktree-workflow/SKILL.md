---
name: Git Worktree Workflow
description: Isolate each agent in its own git worktree and branch, stay inside an ownership lane, and merge only after checks pass. Use when starting work, syncing main, committing, handing off, or resolving a conflict.
metadata:
  origin: DAMM
---

# Git Worktree Workflow

## Non-negotiables

- One agent = one worktree = one branch `agent/<name>`.
- The main checkout is the control plane. Do not code there.
- Never edit another agent's worktree.
- Never force-push a shared branch.
- Never resolve a conflict by deleting the other side.

## Start

```powershell
git rev-parse --show-toplevel
git branch --show-current
```

Expected:

```text
D:\hackclub\damm-worktrees\<agent>
agent/<agent>
```

If you are on `main`, stop and ask the human to open the correct worktree.

## Sync with main

```powershell
git fetch origin
git merge origin/main
```

Resolve conflicts in your lane. If the conflict is in a file you do not own, ask the owner.

## Work

- Read `AGENTS.md` and your agent file.
- Load your skills.
- Stay inside your lane.
- Build and test before committing.

## Commit

```powershell
git status
git diff
git add <only your files>
git commit -m "type(scope): why"
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `chore`.

Good: `fix(collision): prevent tunneling at high speed`
Bad: `update files`

Do not commit:

- `.env.local` or any key
- build output
- absolute local paths
- unrelated formatting churn

## Push

```powershell
git push -u origin agent/<agent>
```

The human may review the branch on GitHub. Worktree directories are local and are not pushed.

## Handoff

```text
Branch: agent/<name>
Worktree: D:\hackclub\damm-worktrees\<name>
Changed: <files>
Built: <command> -> pass/fail
Tested: <command> -> pass/fail
Risks: <known issues>
Next: <one step>
```

## Integrate

The director runs from any checkout:

```powershell
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
```

The script finds the main worktree and merges there. It refuses if:

- the agent worktree is dirty
- the ownership check fails
- `npm run validate` fails
- the main checkout is dirty

## Conflict recovery

1. Stop.
2. Identify the file owner.
3. Read both intents.
4. Re-apply the smaller change on top of main.
5. Rebuild and retest.
6. Re-run check + merge.

If unsure, ask the human. A lost commit is worse than a delayed merge.

## Cleanup

After the merge is on `main` and verified:

```powershell
npm run worktree -- remove <agent>
git branch -d agent/<agent>
git push origin --delete agent/<agent>
```

Never remove a dirty worktree without explicit approval.

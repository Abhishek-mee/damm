# Parallel runs

DAMM makes parallel work safe by giving every agent a separate checkout. This page covers how to run more than one at once without losing work.

## The rule

```text
one agent -> one worktree -> one branch -> one lane
```

Two agents may run at the same time only if their lanes do not overlap. The fanout runner refuses two tasks for the same agent, and `npm run validate` warns when two code lanes overlap.

## Task file

Copy the example and edit it:

```bash
cp damm.tasks.example.json damm.tasks.json
```

```json
{
  "concurrency": 2,
  "tasks": [
    {
      "id": "auth-expiry",
      "agent": "core",
      "prompt": "Reject expired tokens at the verification boundary. Add the failing test first.",
      "verify": "npm test -- auth"
    },
    {
      "id": "empty-state",
      "agent": "frontend",
      "prompt": "Add the empty, loading, and error states to the projects screen.",
      "verify": "npm test"
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | unique, stable, used for the prompt and log file |
| `agent` | yes | one of the 11 roster names |
| `prompt` | yes | the work, in plain language |
| `verify` | no | a command run in the worktree after the agent finishes |

`damm.tasks.json` is gitignored. Keep task text short and specific; free models do better with one system and one outcome.

## Dry run first

```bash
npm run fanout -- --tasks damm.tasks.json
```

This validates the file, shows the agents, worktrees, concurrency, and whether the `opencode` CLI is available. It does **not** create worktrees or start a model.

## Execute

```bash
npm run fanout -- --tasks damm.tasks.json --run
```

What happens:

1. One worktree is created per agent (or reused if it exists).
2. A prompt file is written to `<worktree>/.damm/prompts/<id>.md`.
3. `opencode run --agent <agent>` starts in that worktree.
4. Output is captured in `.damm/logs/<id>.log`.
5. The ownership check runs after each task.
6. The optional `verify` command runs in the worktree.
7. A summary lists pass, fail, and lane violations.

Nothing is merged automatically.

## Concurrency

```bash
npm run fanout -- --tasks damm.tasks.json --run --concurrency 3
```

The runner clamps to 1–4. Free models are rate-limited, and a queue of four is already aggressive. Recommended:

| Situation | Concurrency |
| --- | --- |
| First run, new project | 1 |
| Two independent lanes | 2 |
| Mature lane map, short tasks | 3 |
| Never | 5+ |

## Filtering

```bash
npm run fanout -- --tasks damm.tasks.json --run --only auth-expiry
npm run fanout -- --tasks damm.tasks.json --run --only auth-expiry,empty-state
```

Use `--only` to rerun a failed task without restarting the rest.

## Timeouts

```bash
npm run fanout -- --tasks damm.tasks.json --run --timeout 900
```

A task that exceeds the timeout is terminated and reported as failed. The log still exists.

## Reading the result

```text
start auth-expiry              core         /home/you/code/my-project-worktrees/core
ok    auth-expiry              core         412s  lane pass  verify pass  .damm/logs/auth-expiry.log

Summary
  ok    auth-expiry              lane pass
  FAIL  empty-state              lane FAIL: src/core/session.ts
```

A `lane FAIL` means the agent edited outside its lane. Open the worktree, inspect the diff, and either move the change to the owning agent or revert it. Do not merge.

## Merging

Merge one branch at a time, oldest first:

```bash
npm run worktree -- merge core
npm run worktree -- merge frontend
```

Each merge:

1. checks the lane
2. refuses a dirty base checkout
3. runs the project's `test` script when it exists
4. merges with `--no-ff`
5. leaves the push to you

Rebuild after each merge. If the second merge conflicts, the file owner resolves it; the fanout runner does not guess.

## Failure handling

| Failure | What to do |
| --- | --- |
| Model rate-limited | retry once, then use `--only` later |
| Agent edited out of lane | revert that file, or hand it to the owner |
| Tests fail | fix in the worktree, commit, re-run `check` |
| Merge conflict | owner resolves in its worktree, then re-run `merge` |
| Timeout | read the log; split the task smaller |
| CLI missing | install `opencode`, or set `DAMM_OPENCODE_BIN` |

## Why this is faster

Parallelism only helps when the work is independent. Split by lane, not by file:

- `core` adds a rule and its tests.
- `frontend` adds the screen that calls the rule.
- `qa` writes the end-to-end test against the contract.
- `docs` updates the setup guide.

If two tasks need the same interface, write the interface first, in one lane, then fan out.

## Why this is safer

- A worktree is a full checkout; one agent cannot see another's uncommitted files.
- The lane check runs on the committed and uncommitted diff.
- Merge is serialized and refuses a dirty base.
- Nothing is force-pushed or auto-merged.

See [`WORKTREES.md`](WORKTREES.md) for the full isolation model.

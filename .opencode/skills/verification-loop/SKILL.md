---
name: Verification Loop
description: Verify a change with a clean build, tests, static analysis, smoke run, ownership check, and an evidence report before claiming it is done. Use at the end of every task and before every merge.
metadata:
  origin: DAMM
---

# Verification Loop

## Rule

"Done" means verified, not written. If you cannot verify it, say so.

## Pre-flight

```bash
git status
git branch --show-current
git diff --stat
```

- Confirm the branch is `agent/<name>`.
- Confirm every changed file is in your lane.
- Confirm no secret, build output, or absolute path is staged.

## Build

Use the project's documented command:

```bash
npm run build
# or: cmake --build --preset <preset>
# or: cargo build
```

If the command does not exist yet, use the closest project command and record it. Never claim a build passed without the command and output.

## Tests

```bash
npm test
# or: ctest --preset <preset> --output-on-failure
```

- Run the relevant subset first, then the full suite.
- For a bug fix, show the failing test before the fix and the passing test after.
- For new behavior, show the test that would fail if the behavior regressed.

## Static analysis

```bash
npm run lint
npm run typecheck   # if the project has one
```

- Treat new warnings as failures.
- Do not silence a rule to make the change pass.
- If a tool is unavailable, say which and why.

## Smoke run

Start the real entry point and use the primary flow once:

```bash
npm run dev
# or: ./build/app --smoke
```

Record what you saw: the screen, the output, the exit code. A unit test is not a smoke test.

## Ownership check

```bash
npm run worktree -- check <agent>
```

The check must pass before a merge. If it fails, move the change to the owning agent; do not widen your lane.

## Evidence report

```text
Branch: agent/<name>
Changed: <files>
Built:   <command> -> pass/fail
Tested:  <command> -> pass/fail (<N> tests)
Linted:  <command> -> pass/fail
Smoke:   <command> -> what you observed
Lane:    pass/fail
Risks:   <known gaps>
```

## Honesty rules

- A skipped test is not a pass.
- A build you did not run is not green.
- A warning you did not read is not harmless.
- If the environment cannot run something, write the exact error and what a human must do.
- Never fabricate a command result. A false green costs more than a red.

## Handoff

End the task with the evidence report and one concrete next step.

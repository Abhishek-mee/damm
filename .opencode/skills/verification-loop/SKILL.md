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

```powershell
git status
git branch --show-current
git diff --stat
```

- Confirm the branch is `agent/<name>`.
- Confirm every changed file is in your lane.
- Confirm no secret, build output, or absolute path is staged.

## Build

Use the configured preset:

```powershell
cmake --preset windows-debug
cmake --build --preset windows-debug
```

If the preset does not exist yet, use the closest project command and record it. Never claim a build passed without the command and output.

## Tests

```powershell
ctest --preset windows-debug --output-on-failure
```

- Run the relevant test subset first, then the full suite.
- If a test fails, fix the cause or report it. Do not disable it.
- For visual/audio changes, run the smoke scenario and describe what you observed.

## Static checks

- `clang-format --dry-run --Werror` on changed C++ files.
- `clang-tidy` on changed files if the compile database exists.
- Compiler warnings: no new warnings.
- Shader compile logs: clean.

## Smoke run

Boot the game, perform the changed behavior, and quit. Check:

- window opens/closes
- no crash/assert
- input works
- resize/alt-tab
- logs have no new errors
- memory does not grow every frame (spot check)

## Ownership check

```powershell
npm run worktree -- check <agent>
```

A lane violation blocks the merge. Fix it before asking for review.

## Evidence report

```text
Change: <one sentence>
Branch: agent/<name>
Files: <list>
Build: <command> -> pass/fail
Tests: <command> -> N passed, M failed
Static: <command> -> pass/fail
Smoke: <steps> -> pass/fail
Ownership: pass/fail
Known risks: <list>
```

## Stop conditions

Stop and report if:

- the build fails for a reason outside your lane
- a test failure looks unrelated but is real
- a model/tool call fails twice
- you cannot verify the behavior
- a secret appears in output
- you need to edit another lane

Never fabricate evidence. A false pass is worse than an honest blocker.

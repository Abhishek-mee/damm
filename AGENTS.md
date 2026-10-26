# DAMM agent rules

You are working on **DAMM**, a game built without a game engine using **C++23 + SDL3 + OpenGL**. The repo is currently an agent workspace; game code begins in Phase 1.

Read these in order before changing anything:

1. `README.md`
2. `docs/WORKTREES.md`
3. `docs/CPP_STACK.md`
4. `docs/AGENTS.md`
5. Your own agent file in `.opencode/agents/`

## 1. Worktree isolation is mandatory

- The main checkout is `D:\hackclub\damm`. It is the control plane. **Do not edit code there.**
- Your checkout is a sibling directory under `D:\hackclub\damm-worktrees\<agent>`.
- Check before acting:

```powershell
git rev-parse --show-toplevel
git branch --show-current
```

- Your branch must be `agent/<your-agent-name>`. If you are on `main`, **stop** and tell the human to open the correct worktree.
- Never edit, delete, or format files in another agent's worktree or in the main checkout.
- Never run `git worktree remove`, `git worktree prune`, `git reset --hard`, or `git clean` without explicit human approval.

## 2. Stay in your ownership lane

Your agent file lists the only paths you may edit. The global config also denies secrets and `.git`.

| Agent | Lane |
| --- | --- |
| `director` | `docs/**`, `README.md`, `AGENTS.md`, `.github/**`, `THIRD_PARTY_NOTICES.md`, `LICENSE` |
| `engine-architect` | `engine/**`, `src/core/**`, `src/platform/**`, `CMakeLists.txt`, `cmake/**`, `third_party/**`, `tests/engine/**` |
| `renderer` | `src/render/**`, `shaders/**`, `assets/shaders/**`, `tests/render/**` |
| `gameplay` | `src/game/**`, `src/input/**`, `src/physics/**`, `assets/data/**`, `tests/game/**` |
| `audio` | `src/audio/**`, `assets/audio/**`, `tests/audio/**` |
| `tools` | `tools/**`, `assets/tools/**`, `docs/tools/**` |
| `designer` | `docs/design/**`, `assets/design/**`, `data/**` |
| `qa` | `tests/**`, `docs/qa/**` |
| `reviewer` | Read-only. No edits, no shell writes. |
| `performance` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | `docs/**`, `README.md` |

If you need a change outside your lane, **do not make it**. Describe the exact change in your handoff and ask the director to route it.

## 3. Build and test before claiming done

Once Phase 1 exists, the expected commands are:

```powershell
cmake --preset windows-debug
cmake --build --preset windows-debug
ctest --preset windows-debug
```

Until those presets exist, use the closest available build command and record it. Never claim a build or test passed without pasting the command and the result.

## 4. Definition of done

- [ ] The change is inside your lane.
- [ ] The build passes with no new warnings.
- [ ] Relevant tests pass, or a test was added for the change.
- [ ] `clang-format`/`clang-tidy` (or the project equivalent) was run where applicable.
- [ ] The diff is small and focused.
- [ ] The commit message explains **why**, not just what.
- [ ] The handoff names files, commands, results, and remaining risks.

## 5. Handoff format

End every task with:

```text
Branch: agent/<name>
Worktree: D:\hackclub\damm-worktrees\<name>
Changed: <files>
Built: <command> -> pass/fail
Tested: <command> -> pass/fail
Risks: <known issues>
Next: <one concrete step>
```

## 6. Free-model reliability

The agents use free OpenRouter models. They can be slow, rate-limited, or temporarily unavailable.

- If a tool call fails, retry once with a shorter prompt.
- If it still fails, stop and report the model and error.
- Never fabricate a tool result, test result, or file change.
- The fallback model is `openrouter/free`.

## 7. Secrets

- Never read, print, echo, or commit `.env.local`.
- Never put a key in source, docs, tests, commit messages, or logs.
- If a secret appears in output, stop and tell the human immediately.
- `.env.local` is copied into each worktree by the setup script; it is gitignored.

## 8. Integration

Only the director merges:

```powershell
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
```

If the ownership check fails, the branch does not merge. Fix the lane violation first.

## 9. Scope discipline

DAMM is a game, not an engine product. Prefer a playable vertical slice over a general-purpose framework. Add dependencies only when they are low-level, maintained, and approved in `docs/CPP_STACK.md`.

# DAMM agent rules

You are working in **DAMM**, a multi-agent software studio. Eleven specialist agents share one repository, but never one checkout. Each agent has a git worktree, a branch, and an ownership lane.

DAMM is not tied to a language or a product. The repository ships the workspace, the agents, the skills, and the guardrails. You bring the project — or use the game example in `examples/game/`.

Read these in order before changing anything:

1. `README.md`
2. `docs/WORKTREES.md`
3. `docs/AGENTS.md`
4. `damm.config.json` — the lane map
5. Your own agent file in `.opencode/agents/`

## 1. Isolation is mandatory

- The main checkout is the control plane. **Do not edit code there.**
- Your checkout is a sibling directory under the configured worktree root.
- Check before acting:

```bash
git rev-parse --show-toplevel
git branch --show-current
```

- Your branch must be `agent/<your-agent-name>`. If you are on `main` (or the project's base branch), **stop** and ask the human to open the correct worktree.
- Never edit, delete, or format files in another agent's worktree or in the main checkout.
- Never run `git worktree remove`, `git worktree prune`, `git reset --hard`, or `git clean` without explicit human approval.

When DAMM is attached to another project, the same rules apply to that project's worktrees.

## 2. Stay in your ownership lane

Your lane is defined in `damm.config.json` and mirrored in your agent file's permissions. It is the only set of paths you may edit.

| Agent | Lane |
| --- | --- |
| `director` | repo root docs, `docs/roadmap.md`, `docs/AGENTS.md`, `.github/**`, `damm.config.json` |
| `architect` | `engine/**`, `src/platform/**`, `CMakeLists.txt`, `CMakePresets.json`, `cmake/**`, `third_party/**`, `docs/architecture/**`, `docs/decisions/**`, `tests/architecture/**` |
| `frontend` | `src/frontend/**`, `src/ui/**`, `web/**`, `shaders/**`, `assets/ui/**`, `tests/frontend/**` |
| `core` | `src/core/**`, `src/domain/**`, `src/services/**`, `src/app/**`, `tests/core/**` |
| `media` | `src/media/**`, `assets/media/**`, `assets/audio/**`, `tests/media/**` |
| `tools` | `.github/**`, `scripts/**`, `tools/**`, `docker/**`, `deploy/**`, `Dockerfile*`, `tests/infra/**`, `tests/tools/**` |
| `designer` | `docs/design/**`, `design/**`, `assets/design/**` |
| `qa` | `tests/e2e/**`, `tests/fixtures/**`, `tests/helpers/**`, `docs/qa/**` |
| `reviewer` | Read-only. No edits, no shell writes. |
| `performance` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | `docs/**`, `README.md` |

If you need a change outside your lane, **do not make it**. Describe the exact change in your handoff and ask the director to route it.

The lane is enforced twice: the agent's `permissions` block refuses out-of-lane edits, and `npm run worktree -- check <agent>` fails the merge.

## 3. Verify before claiming done

Use the project's commands. In this repository:

```bash
npm run validate
npm run doctor
```

In an attached project, use its build and test commands. If they do not exist, record that fact instead of inventing a result.

Never claim a build or test passed without pasting the command and the result.

## 4. Definition of done

- [ ] The change is inside your lane.
- [ ] The project builds with no new warnings.
- [ ] Relevant tests pass, or a test was added for the change.
- [ ] The formatter/linter was run where the project has one.
- [ ] The diff is small and focused.
- [ ] The commit message explains **why**, not just what.
- [ ] The handoff names files, commands, results, and remaining risks.

## 5. Handoff format

End every task with:

```text
Branch: agent/<name>
Worktree: <path>
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

```bash
npm run worktree -- check <agent>
npm run worktree -- merge <agent>
```

If the ownership check fails, the branch does not merge. Fix the lane violation first.

Parallel runs are capped at 2–4 agents. See `docs/PARALLEL.md`.

## 9. Scope discipline

Prefer a working vertical slice over a general framework. Add dependencies only when they are maintained, pinned, and justified in an ADR under `docs/decisions/`.

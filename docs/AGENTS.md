# Agent roster

DAMM uses **11 agents** and **17 skills**. Agents are defined in `.opencode/agents/`; skills live in `.opencode/skills/`. The ownership lanes live in `damm.config.json`.

The `model` column is the free OpenRouter model assigned to each role. If a model fails the tool-call check, change that one line in the agent file and run `npm run check-models` again.

| Agent | Mode | Model | Primary skills | Ownership lane |
| --- | --- | --- | --- | --- |
| `director` | primary | `thinkingmachines/inkling:free` | `project-orchestration`, `product-spec`, `verification-loop`, `git-worktree-workflow` | repo root docs, roadmap, roster, config, CI |
| `architect` | subagent | `nvidia/nemotron-3-ultra-550b-a55b:free` | `system-architecture`, `testing`, `performance-profiling`, `git-worktree-workflow` | `engine/**`, `src/platform/**`, build files, ADRs |
| `frontend` | subagent | `cohere/north-mini-code:free` | `frontend-engineering`, `ux-and-flows`, `performance-profiling`, `testing` | `src/frontend/**`, `src/ui/**`, `web/**`, shaders, UI assets |
| `core` | subagent | `poolside/laguna-s-2.1:free` | `core-systems`, `tdd-workflow`, `testing` | `src/core/**`, `src/domain/**`, `src/services/**`, `src/app/**` |
| `media` | subagent | `google/gemma-4-31b-it:free` | `media-pipeline`, `testing` | `src/media/**`, media and audio assets |
| `tools` | subagent | `poolside/laguna-xs-2.1:free` | `developer-tooling`, `system-architecture`, `testing` | CI, scripts, tools, containers, deploy |
| `designer` | subagent | `google/gemma-4-31b-it:free` | `product-spec`, `ux-and-flows`, `user-testing` | `docs/design/**`, `design/**`, design assets |
| `qa` | subagent | `nvidia/nemotron-3.5-lightning:free` | `testing`, `user-testing`, `verification-loop` | `tests/e2e/**`, fixtures, helpers, `docs/qa/**` |
| `reviewer` | subagent | `thinkingmachines/inkling-small:free` | `code-review`, `security-review`, `verification-loop` | Read-only |
| `performance` | subagent | `nvidia/nemotron-3-super-120b-a12b:free` | `performance-profiling`, `testing`, `verification-loop` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | subagent | `dots-studio/dots-3-note-preview:free` | `documentation`, `git-worktree-workflow` | `docs/**`, `README.md` |

## Skill matrix

| Skill | Used by |
| --- | --- |
| `project-orchestration` | director |
| `product-spec` | director, designer |
| `ux-and-flows` | frontend, designer |
| `system-architecture` | architect, tools |
| `frontend-engineering` | frontend |
| `core-systems` | core |
| `media-pipeline` | media |
| `developer-tooling` | tools |
| `testing` | architect, frontend, core, media, tools, qa, performance |
| `tdd-workflow` | core |
| `performance-profiling` | architect, frontend, performance |
| `user-testing` | designer, qa |
| `verification-loop` | director, qa, reviewer, performance |
| `code-review` | reviewer |
| `security-review` | reviewer |
| `git-worktree-workflow` | director, architect, docs |
| `documentation` | docs |

## Collaboration model

```text
human
  └── director (scope, roadmap, integration)
        ├── designer     -> spec, flows, usability
        ├── architect    -> boundaries, platform, build
        ├── frontend     -> screens, components, rendering
        ├── core         -> domain rules, state, persistence
        ├── media        -> audio, video, images, streaming
        ├── tools        -> CI, scripts, containers, releases
        ├── qa           -> tests, fixtures, release verification
        ├── performance  -> benchmarks, profiles, budgets
        ├── docs         -> README, setup, ADRs, changelog
        └── reviewer     -> read-only review before merge
```

The director does **not** write product code. It defines the next vertical slice, assigns one agent per worktree, and merges through `npm run worktree -- merge`.

## Adding an agent

1. Create `.opencode/agents/<name>.md`.
2. Add frontmatter: `description`, `mode`, `model`, `permissions`.
3. Add a lane to `damm.config.json` under `agents`.
4. Add the lane to `AGENTS.md` and this table.
5. Run `npm run validate` and `npm run check-models`.

## Adding a skill

1. Create `.opencode/skills/<id>/SKILL.md`.
2. Add `name` and `description` frontmatter.
3. Keep scripts/references beside `SKILL.md`.
4. Reference the skill ID in the relevant agent prompt.
5. Run `npm run validate`.

## Changing models

Edit the `model:` line in the agent file. Use the full OpenRouter ID after the provider prefix:

```yaml
model: "openrouter/<vendor>/<model>:free"
```

Run `npm run check-models`. A model is only acceptable if the tool-call test passes. The fallback is `openrouter/free`.

## Changing lanes

Lanes are data, not code. Edit `damm.config.json`; the validator, doctor, and worktree checker all read it. Keep the agent's `permissions` block in sync, or validation fails.

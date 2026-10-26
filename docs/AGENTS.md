# Agent roster

DAMM uses **11 agents** and **17 skills**. Agents are defined in `.opencode/agents/`; skills live in `.opencode/skills/`.

The `model` column is the free OpenRouter model assigned to each role. If a model fails the tool-call check, change that one line in the agent file and run `npm run check-models` again.

| Agent | Mode | Model | Primary skills | Ownership lane |
| --- | --- | --- | --- | --- |
| `director` | primary | `thinkingmachines/inkling:free` | `project-orchestration`, `game-design-document`, `verification-loop`, `git-worktree-workflow` | `docs/**`, `README.md`, `AGENTS.md`, `.github/**`, notices, license |
| `engine-architect` | subagent | `nvidia/nemotron-3-ultra-550b-a55b:free` | `low-level-engine-architecture`, `cpp-testing`, `performance-profiling`, `git-worktree-workflow` | `engine/**`, `src/core/**`, `src/platform/**`, `CMakeLists.txt`, `cmake/**`, `third_party/**`, `tests/engine/**` |
| `renderer` | subagent | `cohere/north-mini-code:free` | `opengl-rendering`, `performance-profiling`, `cpp-testing` | `src/render/**`, `shaders/**`, `assets/shaders/**`, `tests/render/**` |
| `gameplay` | subagent | `poolside/laguna-s-2.1:free` | `gameplay-systems`, `cpp-testing`, `tdd-workflow` | `src/game/**`, `src/input/**`, `src/physics/**`, `assets/data/**`, `tests/game/**` |
| `audio` | subagent | `google/gemma-4-31b-it:free` | `game-audio`, `cpp-testing` | `src/audio/**`, `assets/audio/**`, `tests/audio/**` |
| `tools` | subagent | `poolside/laguna-xs-2.1:free` | `asset-pipeline`, `low-level-engine-architecture`, `cpp-testing` | `tools/**`, `assets/tools/**`, `docs/tools/**` |
| `designer` | subagent | `google/gemma-4-31b-it:free` | `game-design-document`, `level-design`, `playtest-and-qa` | `docs/design/**`, `assets/design/**`, `data/**` |
| `qa` | subagent | `nvidia/nemotron-3.5-lightning:free` | `cpp-testing`, `playtest-and-qa`, `verification-loop` | `tests/**`, `docs/qa/**` |
| `reviewer` | subagent | `thinkingmachines/inkling-small:free` | `code-review`, `security-review`, `verification-loop` | Read-only |
| `performance` | subagent | `nvidia/nemotron-3-super-120b-a12b:free` | `performance-profiling`, `cpp-testing`, `verification-loop` | `benchmarks/**`, `profiling/**`, `docs/perf/**` |
| `docs` | subagent | `dots-studio/dots-3-note-preview:free` | `documentation`, `git-worktree-workflow` | `docs/**`, `README.md` |

## Skill matrix

| Skill | Used by |
| --- | --- |
| `project-orchestration` | director |
| `game-design-document` | director, designer |
| `level-design` | designer |
| `low-level-engine-architecture` | engine-architect, tools |
| `opengl-rendering` | renderer |
| `gameplay-systems` | gameplay |
| `game-audio` | audio |
| `asset-pipeline` | tools |
| `cpp-testing` | engine-architect, renderer, gameplay, audio, tools, qa, performance |
| `tdd-workflow` | gameplay |
| `performance-profiling` | engine-architect, renderer, performance |
| `playtest-and-qa` | designer, qa |
| `verification-loop` | director, qa, reviewer, performance |
| `code-review` | reviewer |
| `security-review` | reviewer |
| `git-worktree-workflow` | director, engine-architect, docs |
| `documentation` | docs |

## Collaboration model

```text
human
  └── director (scope, roadmap, integration)
        ├── designer          -> GDD, levels, balance
        ├── engine-architect  -> CMake, platform, core, ECS
        ├── renderer          -> OpenGL, shaders, sprites
        ├── gameplay          -> loop, input, collision, states
        ├── audio             -> mixer, music, SFX
        ├── tools             -> asset pipeline, editors
        ├── qa                -> tests, sanitizers, playtests
        ├── performance       -> profiling, frame budgets
        ├── docs              -> README, ADRs, guides
        └── reviewer          -> read-only review before merge
```

The director does **not** write game code. It defines the next vertical slice, assigns one agent per worktree, and merges through `npm run worktree -- merge`.

## Adding an agent

1. Create `.opencode/agents/<name>.md`.
2. Add frontmatter: `description`, `mode`, `model`, `permissions`.
3. Add a lane to `scripts/ownership.mjs` in `OWNERSHIP`.
4. Add the lane to `AGENTS.md`.
5. Add the agent to this table.
6. Run `npm run validate` and `npm run check-models`.

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

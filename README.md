# DAMM

> A game built without a game engine — **C++ + SDL3 + OpenGL** — by a team of isolated AI agents.

The repo is currently an **agent workspace**, not a game. It contains the agent roster, the skills they load, free OpenRouter model assignments, and a git-worktree system so parallel agents cannot overwrite each other's code.

## What is set up

| Piece | Status |
| --- | --- |
| 11 OpenCode agents | Ready in `.opencode/agents/` |
| 17 reusable skills | Ready in `.opencode/skills/` |
| Free OpenRouter routing | Configured per agent |
| Git worktrees + ownership checks | Ready in `scripts/worktree.mjs` |
| Secret handling | `.env.local` is gitignored and blocked from agents |
| Validation + CI | `npm run validate` and `.github/workflows/validate.yml` |
| Game code | **Not started** — Phase 1 begins after setup |

## Quick start

### 1. Add the OpenRouter key

Open `D:\hackclub\damm\.env.local` and paste the key after `OPENROUTER_API_KEY=`. The file is gitignored.

For the OpenCode desktop app, also connect the provider once:

```text
/connect
# choose OpenRouter
# paste the same key
```

`.env.local` is for scripts and CLI checks; `/connect` is what the app uses.

### 2. Check the workspace

```powershell
npm run doctor
npm run validate
npm run check-models
```

`check-models` verifies the key and sends a tiny tool-call to every free model assigned to an agent. Free models are rate-limited and occasionally unavailable; if one fails, swap it in that agent's file and re-run.

### 3. Create an agent worktree

```powershell
npm run worktree -- new gameplay
npm run worktree -- list
```

The worktree is created **outside** this repo at `..\damm-worktrees\gameplay`, on branch `agent/gameplay`, with a private copy of `.env.local`.

Open that folder in OpenCode, select the matching agent, and work there. Do not edit the main checkout.

### 4. Integrate

```powershell
npm run worktree -- check gameplay
npm run worktree -- merge gameplay
```

`check` validates that the agent only changed files in its ownership lane. `merge` refuses to run if the check fails or the worktree is dirty.

## Agent roster

| Agent | Mode | Free model | Owns |
| --- | --- | --- | --- |
| `director` | primary | `thinkingmachines/inkling:free` | Scope, docs, integration |
| `engine-architect` | subagent | `nvidia/nemotron-3-ultra-550b-a55b:free` | `engine/`, core, platform, CMake |
| `renderer` | subagent | `cohere/north-mini-code:free` | `src/render/`, shaders |
| `gameplay` | subagent | `poolside/laguna-s-2.1:free` | `src/game/`, input, physics |
| `audio` | subagent | `google/gemma-4-31b-it:free` | `src/audio/`, audio assets |
| `tools` | subagent | `poolside/laguna-xs-2.1:free` | `tools/`, asset pipeline |
| `designer` | subagent | `google/gemma-4-31b-it:free` | GDD, levels, balance |
| `qa` | subagent | `nvidia/nemotron-3.5-lightning:free` | `tests/`, test plans |
| `reviewer` | subagent | `thinkingmachines/inkling-small:free` | Read-only review |
| `performance` | subagent | `nvidia/nemotron-3-super-120b-a12b:free` | Benchmarks, profiling |
| `docs` | subagent | `dots-studio/dots-3-note-preview:free` | Docs, ADRs |

Full details, including the exact skills each agent loads, are in [`docs/AGENTS.md`](docs/AGENTS.md).

## Worktree model

```text
D:\hackclub\damm\                     main checkout (control plane)
D:\hackclub\damm-worktrees\           all agent checkouts
├── director\                         branch agent/director
├── engine-architect\                 branch agent/engine-architect
├── renderer\                         branch agent/renderer
├── gameplay\                         branch agent/gameplay
└── ...
```

Every agent has:

1. **Its own directory** — no shared working tree.
2. **Its own branch** — `agent/<name>`.
3. **An ownership lane** — edit permissions plus a pre-merge check.
4. **A private `.env.local` copy** — gitignored, never committed.

The main checkout stays clean. Only the director integrates branches.

## Repository layout

```text
.opencode/
  opencode.jsonc           project config, secrets policy, defaults
  agents/                  11 agent definitions
  skills/                  17 SKILL.md files
docs/
  AGENTS.md                full roster and skill matrix
  WORKTREES.md             workflow, commands, recovery
  CPP_STACK.md             C++/SDL3/OpenGL technical baseline
  UPSTREAM.md              how the referenced repos fit
  design/GDD.md            game design document template
  roadmap.md               phases and acceptance criteria
scripts/
  worktree.mjs             create/list/check/merge/remove worktrees
  check-models.mjs         OpenRouter key + tool-call test
  doctor.mjs               environment check
  validate.mjs             repo/agent/skill validation
AGENTS.md                  rules every agent reads first
```

## Upstream projects

This setup borrows patterns and selected skill ideas from [ECC](https://github.com/affaan-m/ECC) (MIT). The other repos you linked are documented as optional integrations, not vendored:

- [graphify](https://github.com/Graphify-Labs/graphify) — knowledge graphs; needs Claude/Anthropic today.
- [memvid](https://github.com/memvid/memvid) — single-file agent memory.
- [RAG_Techniques](https://github.com/NirDiamant/RAG_Techniques) — RAG patterns.
- [langfuse](https://github.com/langfuse/langfuse) — tracing and evals.
- [ragas](https://github.com/vibrantlabsai/ragas) — RAG evaluation.

See [`docs/UPSTREAM.md`](docs/UPSTREAM.md) before adding any of them.

## Security

- Never commit `.env.local`, API keys, or tokens.
- Agents cannot read or edit `.env.local`.
- `git push`, destructive resets, and cross-worktree access require approval.
- Free models can be unreliable; failures must be reported, not hidden.

## License

The agent configuration in this repo is original work. Adapted ECC material is covered by the MIT license in [`licenses/ECC-LICENSE.txt`](licenses/ECC-LICENSE.txt). See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

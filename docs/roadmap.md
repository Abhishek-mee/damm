# Roadmap

Each phase ends with something playable or verifiable. Do not start a phase before the previous acceptance criteria pass.

## Phase 0 — Agent workspace (current)

- [x] Agent roster and skills
- [x] Free OpenRouter model assignments
- [x] Git worktrees + ownership checks
- [x] Secret policy and validation
- [ ] Human adds OpenRouter key and connects the provider
- [ ] `npm run check-models` passes on the assigned models
- [x] First agent worktrees created

**Acceptance:** `npm run doctor`, `npm run validate`, and `npm run check-models` succeed; the human can open a worktree and select its agent.

## Phase 1 — Window, loop, input, first pixel

Owner: `engine-architect` + `renderer` + `gameplay`

- [ ] CMake presets (`windows-debug`, `windows-release`) and C++23
- [ ] SDL3 window, resize, clean shutdown, ESC quit
- [ ] Fixed-timestep loop with interpolation
- [ ] Input snapshot and action mapping
- [ ] OpenGL context + glad + debug callback
- [ ] Clear color and one textured quad / sprite
- [ ] Catch2 + CTest with one real test
- [ ] Smoke test: boot -> draw -> quit

**Acceptance:** clean clone configures, builds, tests, and shows a window with a sprite; ESC quits cleanly.

## Phase 2 — Core mechanic

Owner: `gameplay` + `designer` + `renderer`

- [ ] One player verb with input buffering
- [ ] One obstacle/enemy
- [ ] Collision and fail state
- [ ] One win condition
- [ ] One level/arena loaded from data
- [ ] Placeholder art/audio
- [ ] Playable in under 10 seconds of explanation

**Acceptance:** a first-time player can understand the goal, act, fail, retry, and win.

## Phase 3 — Feel and feedback

Owner: `gameplay` + `audio` + `renderer`

- [ ] Hitstop / screen shake / particles
- [ ] SFX for every meaningful action
- [ ] Music loop with fade
- [ ] Camera polish
- [ ] Pause/resume, focus-loss handling
- [ ] Options: volumes, screen shake toggle

**Acceptance:** the same mechanic feels materially better; no new crashes or hitches.

## Phase 4 — Content and tools

Owner: `tools` + `designer` + `gameplay`

- [ ] Level/data format + compiler
- [ ] Atlas packer
- [ ] Hot reload for data/assets
- [ ] 3–5 levels or encounters
- [ ] Save/load with versioning

**Acceptance:** a designer can add a level without touching C++; content loads deterministically.

## Phase 5 — Performance and release

Owner: `performance` + `qa` + `docs`

- [ ] Frame budget met on target hardware
- [ ] ASan/UBSan clean
- [ ] Save compatibility tested
- [ ] Packaging and launch from a clean machine
- [ ] Credits/licenses complete
- [ ] Known issues documented

**Acceptance:** a stranger can install, launch, play, and quit without a crash; performance is within budget.

## Next action

1. Human: paste the OpenRouter key into `.env.local` and run `/connect`.
2. Director: run `npm run doctor`, then `npm run check-models`.
3. Director: fill `docs/design/GDD.md` with the human.
4. Director: create `engine-architect`, `renderer`, and `gameplay` worktrees for Phase 1.

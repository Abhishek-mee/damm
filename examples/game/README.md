# Example: a game without an engine

This folder is one worked example of mapping DAMM's generic agents to a specific product. It is **not** the repository's purpose, and nothing here is required to use the workspace.

The example project: a 2D game written in C++23 against SDL3 and OpenGL, with no game engine. It is a good stress test because every subsystem is visible and the ownership boundaries are easy to see.

## Lane map

| Agent | In this example |
| --- | --- |
| `director` | Scope, roadmap, merge decisions |
| `architect` | CMake presets, platform layer, ECS, memory, math |
| `frontend` | OpenGL device, shaders, sprites, HUD |
| `core` | Fixed-timestep loop, input, collision, game states |
| `media` | Mixer, music, SFX, texture decoding |
| `tools` | Asset cooker, atlas packer, level compiler, CI |
| `designer` | GDD, level layouts, balance, playtest script |
| `qa` | Catch2 suites, sanitizers, smoke run |
| `reviewer` | Read-only diff review before merge |
| `performance` | Frame budget, draw calls, allocations |
| `docs` | README, stack notes, ADRs |

## Suggested `damm.config.json`

```json
{
  "version": 1,
  "worktreeRoot": "../damm-worktrees",
  "agents": {
    "director": ["README.md", "AGENTS.md", "docs/roadmap.md", "docs/AGENTS.md", ".github/**"],
    "architect": ["engine/**", "src/platform/**", "CMakeLists.txt", "CMakePresets.json", "cmake/**", "third_party/**", "docs/architecture/**", "docs/decisions/**", "tests/architecture/**"],
    "frontend": ["src/render/**", "shaders/**", "assets/shaders/**", "tests/render/**"],
    "core": ["src/game/**", "src/input/**", "src/physics/**", "assets/data/**", "tests/game/**"],
    "media": ["src/audio/**", "assets/audio/**", "tests/audio/**"],
    "tools": [".github/**", "scripts/**", "tools/**", "tests/tools/**"],
    "designer": ["docs/design/**", "design/**"],
    "qa": ["tests/e2e/**", "tests/fixtures/**", "tests/helpers/**", "docs/qa/**"],
    "reviewer": [],
    "performance": ["benchmarks/**", "profiling/**", "docs/perf/**"],
    "docs": ["docs/**", "README.md"]
  }
}
```

## Reading order

1. [`STACK.md`](STACK.md) — the C++/SDL3/OpenGL baseline and build presets
2. [`GDD.md`](GDD.md) — a one-page design document template
3. [`../../docs/WORKTREES.md`](../../docs/WORKTREES.md) — isolation and merge rules
4. [`../../docs/PARALLEL.md`](../../docs/PARALLEL.md) — running the team at once

## What to copy

- The **shape** of the lanes: one owner per subsystem.
- The **verification loop**: build, test, smoke, lane check.
- The **handoff**: files, commands, results, risks.

## What not to copy

- The specific paths, if your project is not a C++ game.
- The build commands, unless you use the same toolchain.
- The model assignments, if a different model works better for your task.

The workspace is the product. This example is a demonstration.

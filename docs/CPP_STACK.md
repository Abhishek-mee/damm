# C++ / SDL3 / OpenGL baseline

DAMM is a game **without a game engine**. We use low-level libraries and write the systems we need. The goal is a playable vertical slice, not a general-purpose engine.

## Target

| Area | Choice |
| --- | --- |
| Language | C++23 |
| Compiler | MSVC 2022+ on Windows; Clang/GCC later |
| Windowing / input | SDL3 |
| Graphics | OpenGL 4.6 core (fallback 3.3 core if a machine requires it) |
| Loader | glad |
| Build | CMake 3.28+ with presets; Ninja or MSVC generator |
| Dependencies | vcpkg manifest **or** CMake `FetchContent`, pinned |
| Tests | Catch2 v3 + CTest |
| Formatting | clang-format |
| Static analysis | clang-tidy (MSVC `/analyze` where practical) |
| Profiling | Tracy (optional), CPU/GPU timers |
| Platform | Windows first; keep platform code behind an interface |

## Allowed dependencies

Start with this list. Adding anything else requires an ADR in `docs/decisions/` and director approval.

- **SDL3** — window, input, audio device, file I/O
- **glad** — OpenGL function loader
- **stb_image** — PNG/JPG decoding
- **stb_vorbis** or **miniaudio** — OGG/WAV decoding (choose one)
- **glm** (optional) — math; a small hand-written math layer is also fine
- **Catch2** — tests
- **cgltf** (optional) — glTF loading if the game needs 3D
- **Tracy** (optional) — profiling

No raylib, SFML, Godot, Unity, Unreal, or other engines/frameworks that own the game loop.

## Proposed layout

```text
engine/
  core/          math, memory, containers, logging, time
  platform/      SDL window, input, file system
  ecs/           entities, components, systems
  assets/        asset registry, hot reload
  render/        OpenGL device, buffers, shaders, sprites
  audio/         mixer, voices, streaming
src/
  game/          game-specific systems and states
  input/         action mapping, buffering
  physics/       collision, spatial queries
  main.cpp
shaders/
  sprite.vert
  sprite.frag
assets/
  textures/
  audio/
  data/
  shaders/
tests/
  engine/
  game/
  render/
  audio/
tools/
  atlas/         texture atlas builder
  level/         level compiler or editor
benchmarks/
profiling/
third_party/     pinned dependencies if vendored
cmake/
```

This is a starting shape, not a mandate. The engine architect may adjust it, but must keep the lanes in `docs/WORKTREES.md` intact.

## Build presets

Phase 1 creates these. The expected commands are:

```powershell
cmake --preset windows-debug
cmake --build --preset windows-debug
ctest --preset windows-debug

cmake --preset windows-release
cmake --build --preset windows-release
```

Presets must set:

- C++23
- warnings-as-errors for first-party code
- a clear runtime output directory
- `CMAKE_EXPORT_COMPILE_COMMANDS=ON`
- sanitizers in a separate `windows-asan` preset once the toolchain supports it

## Coding rules

- RAII for every resource. No naked `new`/`delete`.
- `std::unique_ptr` for ownership, `std::span`/raw pointers for non-owning views.
- Prefer value types and contiguous storage. Measure before writing a custom allocator.
- No exceptions across the C ABI. SDL/OpenGL calls return errors; check them.
- Fixed timestep for simulation; interpolate for rendering.
- All frame-time code must handle window minimize, focus loss, and resize.
- OpenGL objects are created/destroyed on the render thread. Document any exception.
- No global mutable state except a single, explicit application context.
- Logging goes through the engine logger, not `std::cout` scattered through gameplay.
- Every public engine header must compile standalone.
- Prefer data-driven values (JSON/TOML/custom binary) over hard-coded gameplay numbers.

## Testing rules

- Unit-test pure logic: math, collision, state machines, save/load, damage, inventory.
- Do not unit-test OpenGL directly. Test the renderer's command generation and use a smoke test for the context.
- Use deterministic seeds for simulation and physics tests.
- Add a regression test for every bug that can be reproduced.
- Run ASan/UBSan on the core and gameplay tests once available.
- A test that never fails is not evidence. Show the red/green cycle for new behavior.

## Performance budgets

Initial targets for a 2D game at 1920x1080:

| Budget | Target |
| --- | --- |
| Frame | 16.6 ms (60 FPS) |
| Simulation | 4 ms |
| Render CPU | 6 ms |
| Audio | 2 ms |
| Headroom | 4 ms |

These are starting points. Measure with Tracy or timers before optimizing. Never optimize based on a hunch.

## Asset formats

- Textures: PNG source, GPU-compressed or atlas-packed at build time
- Audio: WAV source for SFX, OGG for music; stream long tracks
- Data: JSON for hand-edited config, custom binary for cooked levels
- Shaders: GLSL source with a manifest; hot reload in debug builds
- Every asset needs a license/source note in `assets/README.md`

## Phase 1 acceptance

The first vertical slice of infrastructure is done when:

1. A window opens and closes cleanly.
2. ESC quits; resize is handled.
3. A fixed-timestep loop runs with an accumulator and interpolation.
4. A colored triangle or sprite renders through the OpenGL pipeline.
5. The build runs from a clean checkout with documented commands.
6. One unit test and one smoke test pass under CTest.

After that, gameplay owns the loop and the engine only grows when the game needs it.

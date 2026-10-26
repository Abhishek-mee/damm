---
name: Low-Level Engine Architecture
description: Build a small C++23 game foundation with SDL3, OpenGL, CMake, a fixed-timestep loop, explicit ownership, and testable interfaces. Use for engine structure, build systems, platform code, ECS, and core utilities.
metadata:
  origin: DAMM
---

# Low-Level Engine Architecture

## Principle

Write the smallest engine the current game needs. A vertical slice beats a framework.

## Layers

```text
platform  -> SDL3 window, input, files, time
core      -> math, memory, logging, assertions, containers
render    -> OpenGL device, buffers, shaders, sprites
audio     -> device, mixer, voices
game      -> rules, entities, states, content
tools     -> offline asset/level processing
```

Dependencies point downward. `game` may call `render`/`audio` through small interfaces; `render` does not know game rules.

## Main loop

Use a fixed timestep for simulation and interpolate for rendering:

```cpp
constexpr double kStep = 1.0 / 120.0;
double accumulator = 0.0;

while (running) {
  const double frame = clock.tick();
  accumulator += std::min(frame, 0.25); // clamp after a pause
  while (accumulator >= kStep) {
    input.begin_step();
    world.update(kStep);
    input.end_step();
    accumulator -= kStep;
  }
  renderer.draw(world, accumulator / kStep);
}
```

Rules:

- Clamp huge frame times after a breakpoint or window drag.
- Do not update gameplay in the render path.
- Keep input edge state per fixed step.
- Make the loop injectable/testable (clock and event source interfaces).

## Ownership

- `std::unique_ptr` for owning heap objects.
- `std::span` for non-owning arrays.
- Handles (index + generation) for entities/assets, not raw pointers into vectors.
- No naked `new`/`delete`.
- No global mutable state except one explicit `AppContext`.
- Every resource has one owner and one destruction point.

## ECS / entities

Start simple:

```cpp
struct Entity { uint32_t index; uint32_t generation; };
template <typename T> struct ComponentPool { std::vector<T> data; };
```

- Stable handles survive vector growth.
- Systems take spans, not whole worlds.
- Iterate components, not entities, for hot paths.
- Do not build a general-purpose archetype ECS before profiling says you need it.

## Error handling

- SDL/OpenGL failures return errors; check them.
- Use `std::expected` or a small `Result<T>` for recoverable failures.
- Assert for programmer errors; log and recover for runtime errors.
- Never continue after a failed critical init (window, GL context, audio device).
- Shut down in reverse order of initialization.

## Build

- CMake 3.28+, presets, C++23.
- Warnings-as-errors for first-party code.
- `CMAKE_EXPORT_COMPILE_COMMANDS=ON` for clangd.
- Pin dependencies (vcpkg manifest or FetchContent with tags/commits).
- One `main` target, one engine library, one test target per area.

## Testing seams

- Clock interface for deterministic loop tests.
- File-system interface for asset tests.
- Renderer interface so gameplay tests do not need a GPU.
- No singletons; pass dependencies explicitly.

## Red flags

- A "manager" with no clear owner.
- A base class hierarchy for entities.
- A custom allocator before measuring.
- A scripting language before the game is fun.
- A render graph before there are two passes.
- A dependency added "for later".

## Definition of done

- Clean configure + build.
- One real test.
- Window/context creation can fail gracefully.
- Shutdown is clean under ASan where available.
- Public headers compile standalone.

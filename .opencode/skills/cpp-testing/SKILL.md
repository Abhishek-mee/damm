---
name: C++ Testing
description: Test C++ game code with Catch2, CTest, sanitizers, deterministic simulation, golden data, and fuzzing. Use when adding tests, fixing bugs, or validating a build.
metadata:
  origin: DAMM
---

# C++ Testing

## Stack

- Catch2 v3
- CTest presets
- ASan/UBSan where the toolchain supports it
- A fuzz target for parsers/save files
- Deterministic seeds for simulation

## Test pyramid

| Layer | What | Speed |
| --- | --- | --- |
| Unit | math, collision, state machines, inventory | ms |
| Integration | save/load, level load, event flow | < 1 s |
| Smoke | boot window, create context, draw one frame, quit | seconds |
| Fuzz | asset/save/level parsers | minutes (nightly) |

Do not unit-test OpenGL calls directly. Test the command generation and use one hidden-window smoke test.

## Catch2 example

```cpp
#include <catch2/catch_test_macros.hpp>
#include "physics/aabb.hpp"

TEST_CASE("AABB overlap includes touching edges", "[physics]") {
  Aabb a{{0, 0}, {10, 10}};
  Aabb b{{10, 0}, {20, 10}};
  REQUIRE(overlaps(a, b));
}

TEST_CASE("AABB does not overlap when separated", "[physics]") {
  Aabb a{{0, 0}, {10, 10}};
  Aabb b{{11, 0}, {20, 10}};
  REQUIRE_FALSE(overlaps(a, b));
}
```

## CMake

```cmake
include(FetchContent)
FetchContent_Declare(
  Catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v3.7.1
)
FetchContent_MakeAvailable(Catch2)

add_executable(engine_tests tests/engine/test_main.cpp tests/engine/test_aabb.cpp)
target_link_libraries(engine_tests PRIVATE engine Catch2::Catch2WithMain)
include(Catch)
catch_discover_tests(engine_tests)
```

Pin the tag. Do not track `main`.

## Determinism

- Inject the RNG seed.
- Run fixed steps, not wall-clock time.
- Avoid unordered container iteration in simulation.
- Compare state snapshots, not floats, for whole-world tests.
- Use an epsilon for float comparisons and state why.

## Regression tests

For every bug:

1. Reproduce with a failing test.
2. Show the failure (red).
3. Fix the smallest cause.
4. Show the pass (green).
5. Keep the test.

## Sanitizers

- Add a `windows-asan` or `linux-asan` preset.
- Run core/gameplay tests under ASan+UBSan.
- Treat leaks and UB as failures.
- Note known third-party suppressions explicitly.

## Fuzzing

- Target parsers: save files, level data, asset manifests.
- Provide a seed corpus.
- Assert no crash, no OOM, and bounded output.
- Run in CI nightly, not on every push.

## Rules

- A skipped test is not a pass.
- A test that never fails is not evidence.
- Test behavior and contracts, not private implementation details.
- Keep tests fast; move slow tests to a separate preset.
- Never commit generated test output.

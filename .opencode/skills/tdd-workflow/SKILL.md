---
name: TDD Workflow
description: Write a failing C++ test first, implement the smallest change to pass, then refactor with evidence. Use when adding gameplay behavior, fixing a bug, or changing a deterministic system.
metadata:
  origin: DAMM
---

# TDD Workflow

## Cycle

```text
RED    -> write one failing test for one behavior
GREEN  -> smallest implementation that passes
REFACTOR -> clean up with tests still green
```

Do not write a batch of tests and a batch of code. One behavior at a time.

## Test seam

Before writing the test, identify the seam:

- pure function (math, collision, damage)
- system update with an injected world/input/clock
- parser with a string/file buffer
- state machine with explicit transitions

If there is no seam, the design is too coupled. Fix the seam first, not the test.

## Example

```cpp
TEST_CASE("player loses one health when hit", "[gameplay]") {
  Player p{.health = 3};
  apply_damage(p, 1);
  REQUIRE(p.health == 2);
}
```

Then implement `apply_damage`. Then add the edge case:

```cpp
TEST_CASE("damage does not go below zero", "[gameplay]") {
  Player p{.health = 1};
  apply_damage(p, 5);
  REQUIRE(p.health == 0);
}
```

## Game-specific rules

- Fixed steps, deterministic seed, no wall clock.
- Test the rule, not the renderer/audio device.
- For collision, test corners, touching edges, high speed, and overlap.
- For saves, test round-trip, version mismatch, truncated file, and bad lengths.
- For state machines, test allowed and forbidden transitions.
- For input, test buffering and edge state per step.

## Evidence

Record:

```text
RED:   <test name> failed because <reason>
GREEN: <test name> passed
Suite: <N> passed, 0 failed
```

A test that has never failed is not evidence.

## Coverage

- 80%+ on core logic (math, collision, state, saves).
- 100% on security-sensitive parsers' rejection paths.
- Do not chase coverage on glue code or generated code.
- Do not test private implementation details.

## Anti-patterns

- Writing the implementation first, then a test that mirrors it.
- Asserting on logs instead of state.
- Sleeping for time instead of injecting a clock.
- Random tests without a seed.
- Disabling a flaky test instead of fixing the nondeterminism.
- Testing OpenGL calls directly.

## Handoff

Include the red/green evidence and the exact test command.

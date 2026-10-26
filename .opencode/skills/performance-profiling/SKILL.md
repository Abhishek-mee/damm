---
name: Performance Profiling
description: Measure frame time, CPU/GPU cost, allocations, and draw calls with a repeatable benchmark before optimizing. Use when the game is slow, a frame budget is exceeded, or a change needs regression evidence.
metadata:
  origin: DAMM
---

# Performance Profiling

## Rule

No optimization without a measurement. No measurement without a scenario.

## Scenario template

```text
Build: windows-release, MSVC 2022, driver <version>
Hardware: <CPU/GPU/RAM>
Resolution: 1920x1080, vsync off
Scene: <level, entity count, effects>
Warmup: 10 s
Sample: 60 s or 3 x 20 s
Metric: median frame, p95, p99, worst
```

## What to measure

- frame time (CPU and GPU)
- simulation time
- render CPU time
- draw calls, batches, state changes
- audio callback time
- allocations per frame
- peak memory and asset memory
- load time

## Tools

- Tracy for instrumented CPU/GPU zones (optional).
- `std::chrono::steady_clock` for a simple frame timer.
- `glQueryCounter` / timer queries for GPU passes.
- RenderDoc for draw-call and pipeline inspection.
- Platform profilers (Visual Studio, PIX, Nsight) when available.

## Method

1. Reproduce the slow scenario.
2. Capture a baseline at least 3 times.
3. Find the largest cost, not the most interesting one.
4. Form one hypothesis.
5. Change one thing.
6. Re-run the exact scenario.
7. Report the delta and the noise.
8. Add a regression threshold if it matters.

## Common wins

- batch sprites by texture/state
- remove per-frame allocations
- avoid redundant uniform/state updates
- cache transforms and bounds
- use a spatial hash for broad-phase collision
- stream long audio instead of decoding every frame
- reduce overdraw before adding fancy effects
- profile release builds with debug info, not debug builds

## Report template

```text
Scenario:
Before: median X ms, p99 Y ms, draw calls Z
After:  median X ms, p99 Y ms, draw calls Z
Change: <one sentence>
Risk: <quality/behavior trade-off>
Regression check: <command or test>
```

## Rules

- Never compare different builds, resolutions, drivers, or background loads.
- A single fast frame is noise.
- Do not optimize startup-only code for frame rate.
- Do not add a dependency for profiling without approval.
- Keep benchmark scenes deterministic.
- Record the hardware; a laptop on battery is not a baseline.

## Budgets

| Metric | Target |
| --- | --- |
| Frame | 16.6 ms at 60 FPS |
| Simulation | 4 ms |
| Render CPU | 6 ms |
| Audio | 2 ms |
| Headroom | 4 ms |

Adjust only with the director and a documented reason.

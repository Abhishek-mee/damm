---
name: Performance Profiling
description: Measure latency, throughput, memory, CPU, and GPU cost with a repeatable benchmark before optimizing. Use when something is slow, a budget is exceeded, or a change needs regression evidence.
metadata:
  origin: DAMM
---

# Performance Profiling

## Rule

No optimization without a measurement. No measurement without a scenario.

## Scenario template

```text
Build: <release/debug, compiler, version>
Hardware: <CPU/GPU/RAM, power mode>
Workload: <data size, concurrency, viewport, scene>
Warmup: <duration or iterations>
Sample: <3 runs of N seconds or N requests>
Metric: median, p95, p99, worst
```

## What to measure

- end-to-end latency and tail latency
- CPU time per phase
- GPU frame time and draw calls, when graphics exist
- allocations per operation and peak memory
- I/O and network time
- startup and first-interaction time
- throughput under concurrency

## Tools

- The platform profiler first: Visual Studio, Perf, Instruments, Chrome DevTools, `perf`.
- Language profilers and allocation trackers.
- GPU tools: RenderDoc, Nsight, PIX, timer queries.
- A benchmark harness in `benchmarks/` that anyone can run.
- Logs and traces with correlation IDs for distributed paths.

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

- remove per-request or per-frame allocation
- batch I/O and draw calls
- cache immutable work with a clear invalidation
- add an index or reduce N+1 queries
- stream large payloads instead of buffering
- parallelize independent work; bound the queue
- reduce overdraw before adding effects
- profile release builds with symbols, not debug builds

## Report template

```text
Scenario:
Before: median X, p99 Y, memory Z
After:  median X, p99 Y, memory Z
Change: <one sentence>
Risk: <quality/behavior trade-off>
Regression check: <command or test>
```

## Rules

- Never compare different builds, workloads, or background loads.
- A single fast run is noise.
- Do not optimize startup-only code for steady-state throughput.
- Do not add a dependency for profiling without approval.
- Keep benchmark data deterministic.
- Record the hardware; a laptop on battery is not a baseline.

## Budgets

Set budgets per product, not per framework. Example for an interactive app:

| Metric | Target |
| --- | --- |
| Input to visible response | < 100 ms |
| Frame | 16.6 ms at 60 FPS |
| Main-thread task | < 50 ms |
| Startup to interactive | < 2 s |
| Peak memory | < agreed ceiling |

Adjust only with the director and a documented reason.

## Handoff

Report baseline, result, variance, commands, and the next concrete step.

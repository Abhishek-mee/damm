---
name: Media Pipeline
description: Build deterministic audio, video, and image pipelines with decoding, mixing, streaming, caching, and license tracking. Use for media ingestion, playback, and realtime output.
metadata:
  origin: DAMM
---

# Media Pipeline

## Pipeline

```text
source -> validate -> decode -> process -> cache -> play -> release
```

Keep each stage replaceable and measurable. Decode during load, not during playback.

## Audio

- Open the device once; handle device loss and format changes.
- Mix with headroom; clip only at the final stage.
- Use categories (master, music, SFX, UI) and per-category gain.
- Fade to avoid clicks; stop all on focus loss.
- Stream long tracks; keep short effects in memory.
- Never block the audio callback with I/O, allocation, logging, or locks.

## Video and images

- Validate dimensions, codec, and duration before allocating.
- Decode off the main thread; deliver frames through a bounded queue.
- Drop frames instead of growing memory when behind.
- Cache immutable thumbnails and decode results.
- Handle corrupt and unsupported files with a visible fallback.

## Assets

- Keep source and cooked formats separate.
- Record the license and source of every asset.
- Make cooking deterministic: same inputs, same bytes.
- Version the manifest; fail the build on a missing or stale asset.
- Hot reload only in development, behind a flag.

## Testing

- Mixing math, gain curves, and queue behavior are unit-testable.
- Test malformed, truncated, and zero-length files.
- Smoke-test the real device path; skip gracefully in CI.
- Measure startup decode time and steady-state memory.

## Definition of done

- The path works with the real device and degrades safely without one.
- No stalls, clicks, or unbounded queues.
- Licenses are recorded.
- Tests cover the failure modes.

## Handoff

Report what was heard or seen, format and latency notes, commands and results, and the next concrete step.

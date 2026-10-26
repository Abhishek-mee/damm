---
name: Game Audio
description: Build a low-latency SDL3 audio mixer with WAV/OGG playback, categories, spatial pan, music streaming, and a non-blocking game-to-audio queue. Use for sound effects, music, mixing, and audio debugging.
metadata:
  origin: DAMM
---

# Game Audio

## Architecture

```text
game thread -> command queue -> audio thread -> SDL3 audio stream -> device
```

- Gameplay emits events (`play(SfxId, position, volume)`), never raw samples.
- Audio thread mixes into the device buffer.
- No locks, allocation, file I/O, or logging in the callback.
- Use a bounded SPSC ring buffer; drop or coalesce when full.

## SDL3 setup

- `SDL_Init(SDL_INIT_AUDIO)`.
- Choose a format (e.g. 48 kHz, stereo, float32 or S16) and document it.
- Open a device or stream; handle failure gracefully (game still runs silently).
- Use `SDL_AudioStream` for format conversion when needed.
- Pause/resume on focus loss if the platform requires it.

## Voices

```cpp
struct Voice {
  const Sample* sample;
  double position;
  float gain;
  float pan;
  bool loop;
  bool active;
};
```

- Decode on load; keep PCM in memory for SFX.
- Stream long music tracks in chunks.
- Apply gain in a predictable order: sample -> voice -> category -> master.
- Soft-clip or limit the master to avoid harsh distortion.
- Stop/fade voices on scene change; never leak active voices.

## Categories

- Master
- Music
- SFX
- UI
- Ambience

Expose volume per category in options. Persist them. Duck music under dialogue if needed.

## Spatial (2D)

- Pan = normalized horizontal offset from the listener.
- Attenuation = clamp based on distance.
- Keep a minimum audible gain so important cues are not lost.
- For 3D later, use a documented distance model; do not fake it with arbitrary curves.

## Music

- Loop points must be sample-accurate.
- Crossfade between tracks over a fixed time.
- Do not restart music on every scene transition unless intended.
- Handle missing tracks with silence and a log.

## Testing

- Headless tests for gain math, pan, queue ordering, and voice stealing.
- Device smoke test: play a 1-second tone, then stop.
- Check for clicks at start/stop (use short fades).
- Measure callback time; report worst-case.

## Rules

- Never block the audio callback.
- Never allocate per voice per frame.
- Never trust an audio file's sample rate/channels; convert.
- Never ship an unlicensed track.
- Document the asset format and license in `assets/audio/README.md`.

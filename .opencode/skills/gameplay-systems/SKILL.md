---
name: Gameplay Systems
description: Implement a fixed-timestep game loop, input buffering, entity state machines, collision, save/load, and game feel in C++. Use for player/enemy behavior, controls, physics, and the core loop.
metadata:
  origin: DAMM
---

# Gameplay Systems

## Update order

```text
1. poll platform events
2. update input edges
3. fixed-step:
   a. input -> intentions
   b. movement integration
   c. collision detection/resolution
   d. combat/interactions
   e. state transitions
   f. timers/cooldowns
   g. emit events (audio, VFX, UI)
4. render with interpolation
```

Keep this order stable. Document any change; subtle order bugs are hard to find.

## Input

- Separate raw input (keys, mouse, gamepad) from actions (`move`, `jump`, `fire`).
- Support rebinding; store bindings in data.
- Buffer jump/attack for 100–150 ms.
- Add coyote time where the genre expects it.
- Use radial dead zones for sticks.
- Edge state (`pressed`, `released`) is per fixed step, not per render frame.
- Never read SDL events inside gameplay systems; pass an input snapshot.

## Entities and state

- Stable handles, not raw pointers.
- State machines for player/enemy modes: `Idle`, `Run`, `Jump`, `Attack`, `Hurt`, `Dead`.
- Each state: enter, update, exit, allowed transitions.
- Data-driven timings and speeds.
- One system owns one concern; avoid a `GameManager` god object.

## Collision

- Start with AABB and circles.
- Separate broad phase (spatial hash/grid) from narrow phase.
- Resolve axis-by-axis for platformers; document the order.
- Use continuous checks for fast projectiles.
- Return contact data (normal, penetration, entity), not just a boolean.
- Test corners, slopes, high speed, and overlap at spawn.

## Save/load

- Version every save file.
- Serialize stable IDs, not pointers.
- Validate ranges and lengths before applying.
- Never trust a save file from disk.
- Keep a checksum for corruption detection.
- Test: save -> load -> compare state.

## Game feel

- Hitstop: freeze or slow the simulation for a few frames.
- Screen shake: bounded, optional, and accessible.
- Squash/stretch and particles for impact.
- Audio hooks for every meaningful action.
- Camera lag/lead, but keep the player readable.
- Add juice after the mechanic is correct, not before.

## Data-driven tuning

Put numbers in `assets/data/`:

```json
{
  "player": { "moveSpeed": 220.0, "jumpVelocity": -420.0, "coyoteTime": 0.1 },
  "enemy": { "speed": 90.0, "aggroRange": 180.0 }
}
```

Hot reload in debug builds. Validate missing keys with a clear error.

## Testing

- Pure logic tests: movement, collision, damage, transitions, saves.
- Deterministic seeds for random behavior.
- Simulate fixed steps headlessly.
- Regression test every bug.
- Do not test rendering/audio in gameplay unit tests.

## Handoff

State the mechanic, tuning values, test commands, and what the player should feel. Include a short clip or screenshot when visual.

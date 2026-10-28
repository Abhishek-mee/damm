# Example game design document

> Status: **template**, example only.
> Owner: `designer`. Keep this file short and current; delete stale sections.
> A vertical slice is more valuable than a feature list.
>
> This document demonstrates how the `designer` agent works on a game. Your product's spec belongs in `docs/design/SPEC.md` in your own repository.

## 1. One-line pitch

`<Who is the player, what do they do, and why is it fun? One sentence.>`

## 2. Fantasy and feeling

- **Fantasy:** `<the role the player wants to inhabit>`
- **Feeling:** `<three adjectives, e.g. tense, precise, lonely>`
- **Reference touchstones:** `<two games or films, and the specific quality borrowed>`

## 3. Pillars

1. `<pillar>` — `<what it means for a design decision>`
2. `<pillar>` — `<what it means for a design decision>`
3. `<pillar>` — `<what it means for a design decision>`

If a feature does not serve a pillar, cut it.

## 4. Core loop

```text
observe -> decide -> act -> feedback -> escalate -> repeat
```

- **Moment-to-moment (seconds):** `<the verb the player repeats>`
- **Session (minutes):** `<the goal that makes them continue>`
- **Run/meta (hours):** `<what changes between attempts, if anything>`

## 5. Controls

| Input | Action | Notes |
| --- | --- | --- |
| `WASD` / arrows | move | `<8-way or analog?>` |
| `<key>` | `<action>` | `<buffer/coyote rules>` |
| `Esc` | pause | must not lose progress |

Gamepad support: `<none for the slice / mirror the keyboard mapping>`.

## 6. Rules and systems

- **Player:** `<health, speed, resources, failure condition>`
- **Enemies/hazards:** `<one behavior each, readable tell>`
- **Space:** `<2D/3D, camera, scale in world units>`
- **Progression:** `<what gets harder and how>`
- **Win state:** `<exact condition>`
- **Lose state:** `<exact condition and recovery>`

## 7. Content scope (vertical slice)

| Content | Count | Acceptance |
| --- | --- | --- |
| Levels/arenas | 1 | playable start to finish |
| Player mechanics | `<1–2>` | feel test passes |
| Enemy/hazard types | `<1>` | readable and fair |
| Weapons/tools | `<1>` | one clear use |
| Audio | `<1 loop + 3 SFX>` | no clicks, no stalls |
| UI screens | title, HUD, pause, win/lose | keyboard + gamepad |

Explicitly **out of scope** for the slice:

- `<save systems, menus beyond pause, online, procedural generation, ...>`

## 8. Tuning data

Numbers live in `assets/data/` and are loaded at runtime, not compiled in.

| Value | Starting number | Range | Owner |
| --- | --- | --- | --- |
| player speed | `<units/s>` | `<min–max>` | gameplay |
| jump height | `<units>` | `<min–max>` | gameplay |
| enemy speed | `<units/s>` | `<min–max>` | gameplay |
| music gain | `<dB>` | `<min–max>` | audio |

## 9. Presentation

- **Camera:** `<fixed / follow / zoom rules>`
- **Art:** `<resolution, palette, silhouette rules>`
- **Readability:** `<how threats, pickups, and exits are distinguished>`
- **Audio:** `<music intent, SFX priority, silence rules>`

## 10. Vertical-slice definition of done

- [ ] A new player can start, play, win, lose, and restart without instructions.
- [ ] One complete level runs at the target frame budget on the reference machine.
- [ ] No placeholder art or audio in the critical path.
- [ ] Build, tests, and a recorded playtest pass.
- [ ] `docs/roadmap.md` marks the slice complete.

## 11. Open questions

| Question | Owner | Decision |
| --- | --- | --- |
| `<question>` | `<agent>` | `<pending / answer>` |

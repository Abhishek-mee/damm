---
name: Game Design Document
description: Turn a game idea into a short, testable GDD with pillars, a core loop, controls, content scope, and a vertical-slice definition. Use when defining or changing the game concept, scope, or win/lose conditions.
metadata:
  origin: DAMM
---

# Game Design Document

## Rule

The GDD is a decision tool, not a novel. Keep it to one page until the vertical slice is fun. Update it when behavior changes.

Location: `docs/design/GDD.md`.

## Template

```md
# DAMM — Game Design Document

## 1. One sentence
<What the player does, for whom, and why it is fun.>

## 2. Pillars
- <Pillar 1>: <what it means for decisions>
- <Pillar 2>:
- <Pillar 3>:

## 3. Core loop
<Action -> feedback -> reward/risk -> repeat. One paragraph or a diagram.>

## 4. Controls
| Input | Action | Notes |
| --- | --- | --- |
| WASD / arrows | move | |
| Space | primary verb | |
| Esc | pause/quit | |

## 5. Rules
- Win:
- Lose:
- Score/progress:
- Failure recovery:

## 6. Content for the vertical slice
- 1 level / arena
- 1 player verb
- 1 enemy or obstacle
- 1 pickup or reward
- 1 win state, 1 lose state

## 7. Art direction
<Silhouette, palette, camera, reference.>

## 8. Audio direction
<Music mood, key SFX, silence rules.>

## 9. Scope cuts
- Not in v1:
- Maybe later:
- Never:

## 10. Risks
| Risk | Why | Mitigation |
| --- | --- | --- |

## 11. Open questions
- ...
```

## Quality checks

- Can a new player understand the goal in 10 seconds?
- Does the core loop work without art or audio?
- Is every mechanic testable?
- Is the vertical slice smaller than the team's enthusiasm?
- Does each pillar reject at least one tempting feature?

## Vertical slice

A slice is done when a stranger can:

1. launch the game,
2. understand the goal,
3. perform the core verb,
4. fail once and understand why,
5. win or lose,
6. want one more attempt.

If any step needs an explanation outside the game, the slice is not done.

## Change control

- A new mechanic must name the pillar it serves.
- A new content type must fit the slice or be cut.
- A new dependency must pass `docs/CPP_STACK.md`.
- Record major changes in `docs/decisions/`.

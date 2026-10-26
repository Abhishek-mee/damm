---
name: Level Design
description: Block out levels with readable metrics, pacing, affordances, and encounters, then turn them into data the runtime can load. Use when designing a level, arena, tutorial, or encounter flow.
metadata:
  origin: DAMM
---

# Level Design

## Start with a blockout

Use a simple top-down or side-view diagram in `docs/design/levels/<name>.md`:

```text
################
#..P....E.....#
#..###...##...#
#......K......#
################
P player  E enemy  K key  # wall  . floor
```

State the intent above the diagram:

- What should the player learn?
- What is the emotional beat?
- How long should it take?
- What can go wrong?

## Metrics

Define these before placing content:

| Metric | Value |
| --- | --- |
| Player width/height | |
| Move speed | |
| Jump height/distance | |
| Camera view | |
| Tile/room size | |
| Enemy aggro range | |
| Safe reaction time | >= 250 ms |

Keep metrics in one table and use them consistently. A level that violates its own metrics feels unfair.

## Pacing

Use a rhythm:

```text
learn -> practice -> test -> reward -> twist -> rest
```

- Introduce one idea at a time.
- Let the player succeed before combining ideas.
- Put a safe rest after a hard beat.
- Tease the next area before the player reaches it.
- End with a payoff, not a corridor.

## Affordances

- Walkable vs blocked must be obvious at a glance.
- Danger must read before it hurts.
- Interactive objects need a consistent visual/audio language.
- The exit and the goal must be distinguishable.
- Never hide a required object behind an unrelated color.

## Encounters

For each encounter, write:

```text
Enter: <what the player sees>
Pressure: <what forces movement>
Out: <how it ends>
Escape: <how to disengage>
Reward: <what changed>
```

If there is no escape, the encounter must be short and readable.

## Data format

Levels are data, not code. The first format can be:

- ASCII grid for blockouts
- JSON/TOML for entities, spawns, and triggers
- a cooked binary for release

Every level file needs:

- a stable ID
- a version
- a title
- an author/source
- a validation rule

Do not hard-code level content in C++.

## Playtest

Watch a first-time player without explaining anything. Note:

- where they stop
- where they go wrong
- where they stop reading the screen
- where they smile
- where they quit

Fix the level, not the player.

## Handoff

Give `gameplay` and `tools`:

- the blockout
- the entity list
- the metrics
- the intended pacing
- the acceptance test ("player can reach the exit without taking damage")

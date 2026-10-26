---
name: Playtest and QA
description: Plan smoke tests, write reproducible bug reports, run playtests, and gate releases on evidence. Use before a demo, after a risky change, or when validating fun and correctness.
metadata:
  origin: DAMM
---

# Playtest and QA

## Test plan

For each build, list:

```text
Build: <commit, preset>
OS/GPU:
Tester:
Duration:
Scenarios:
  1. boot -> menu -> play -> pause -> resume -> quit
  2. win path
  3. lose path
  4. resize / alt-tab / minimize
  5. save -> quit -> load
Expected:
Actual:
```

## Bug report template

```text
Title: <short, specific>
Severity: blocker | high | medium | low
Build: <commit/preset>
Environment: <OS, GPU, driver, display>
Steps:
  1.
  2.
Expected:
Actual:
Repro rate: <x/y>
Logs:
Owner: <agent>
```

Rules:

- Reproduce before filing.
- Reduce to the smallest case.
- One bug per report.
- Attach the log tail, not the whole log.
- Never include a secret or full save file with personal data.

## Severity

| Severity | Meaning |
| --- | --- |
| Blocker | Cannot boot, crash, data loss, security issue |
| High | Core loop broken, major visual/audio failure |
| Medium | Noticeable but playable |
| Low | Cosmetic, edge case, typo |

## Playtest script

Ask the player to:

1. Start the game without help.
2. Say what they think the goal is.
3. Play for 10 minutes.
4. Narrate confusion, not solutions.
5. Try to win.
6. Try again after failing.

Observe:

- where they stop
- where they look
- what they ignore
- when they smile
- when they quit

Do not explain the game during the first run. Fix the game, not the player.

## Release gate

- [ ] Clean configure + build
- [ ] All tests pass
- [ ] Smoke test passes
- [ ] ASan/UBSan pass (if available)
- [ ] No blocker/high bugs open
- [ ] Save compatibility checked
- [ ] Performance within budget
- [ ] Known issues documented
- [ ] Assets licensed and credited

## Honesty

A skipped test is not a pass. A crash that happens once is still a bug. A "flaky" test needs evidence, not a label.

---
name: User Testing
description: Plan usability sessions, write reproducible bug reports, observe real users, and gate releases on evidence. Use before a demo, after a risky change, or when validating whether the product is understandable.
metadata:
  origin: DAMM
---

# User Testing

## Goal

Find out whether a real person can complete the primary flow without the author in the room.

## Session plan

1. **Question** — what decision will this session inform?
2. **Participant** — who matches the target user?
3. **Task** — one observable goal, no feature names.
4. **Setup** — clean state, realistic data, recording consent.
5. **Success** — what counts as completion, time, or recovery?
6. **Script** — neutral prompts, no leading.

## Facilitation

- Ask the participant to think aloud.
- Do not explain the interface. If they are stuck, record it.
- Ask "what did you expect?" after a surprise.
- Silence is data. Let them struggle long enough to reveal the model.
- Stop after the pattern repeats; five sessions often beat fifty.

## Bug report

```text
Title: <observable failure>
Build: <commit / version / platform>
Steps:
  1.
  2.
Expected:
Actual:
Evidence: <screenshot, log, video timestamp>
Severity: blocker | high | medium | low
Frequency: always | sometimes | once
```

A bug report without reproduction steps is a rumor.

## Release gate

- Primary flow completed by someone who did not write it.
- No blocker or high-severity bug open.
- Known issues documented.
- The install/launch path works on a clean machine.
- Recovery from the most likely mistake works.

## Metrics that matter

- Task completion, not clicks.
- Time to first success.
- Error recovery rate.
- Confusion moments, quoted.
- Would the user use it again? Why?

## Handoff

Report the question, participants, tasks, findings, evidence, and the next concrete step.

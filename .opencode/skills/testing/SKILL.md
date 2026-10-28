---
name: Testing
description: Design deterministic tests across unit, integration, end-to-end, fuzzing, and sanitizers, and gate merges on evidence. Use when adding tests, fixing bugs, or validating a build.
metadata:
  origin: DAMM
---

# Testing

## Test pyramid

- **Unit** — pure rules, fast, no I/O.
- **Integration** — real boundaries: database, filesystem, HTTP, device.
- **End-to-end** — the user flow through the real entry point.
- **Smoke** — boot, use, quit, from a clean state.
- **Fuzz / property** — parsers, state machines, protocol input.

Do not replace a unit test with a slow end-to-end test. Do not ship with only unit tests.

## Determinism

- Control time, randomness, and network.
- Fixed seeds and fake clocks.
- No sleeps for synchronization; use events or polling with a deadline.
- Isolate test data; clean up in a finally block.
- Run tests in a fixed order or in parallel only when independent.

A flaky test is a bug. Quarantine it with an owner and a deadline; do not retry it into green.

## Regression rule

Every bug fix starts with a test that fails for the right reason, then passes after the fix. Paste both results in the handoff.

## Compiled languages

- Use the project's existing framework and register tests with its runner.
- Run sanitizers on core tests; thread sanitizers where concurrency exists.
- Test public behavior, not private helpers.
- Use golden files for serialization and parsers.
- Test error paths: missing file, corrupt data, denied permission, allocation failure where practical.

## Frontend and services

- Test the primary flow and the error state.
- Accessibility checks in CI.
- Contract tests for APIs; schema validation for payloads.
- One smoke test that starts the real app.

## Evidence

```text
Command:
Result: pass/fail
Tests: <counts>
Coverage: <only if meaningful>
Artifacts: <logs, screenshots, profiles>
```

A test that never fails is not evidence.

## Definition of done

- The new behavior has a test that would catch a regression.
- The suite is deterministic.
- Failure output points at the cause.
- The relevant sanitizers or linters pass.

## Handoff

Report exact commands, results, and known gaps.

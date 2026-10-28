---
name: TDD Workflow
description: Write a failing test first, implement the smallest change to pass, then refactor with evidence. Use when adding behavior, fixing a bug, or changing a deterministic system.
metadata:
  origin: DAMM
---

# TDD Workflow

## Cycle

```text
RED      -> write one failing test for one behavior
GREEN    -> smallest implementation that passes
REFACTOR -> clean up with tests still green
```

Do not write a batch of tests and a batch of code. One behavior at a time.

## Test seam

Before writing the test, identify the seam:

- pure function (parsing, math, validation)
- state machine with explicit transitions
- service with an injected clock, repository, or client
- HTTP handler with a request/response contract
- component with a rendered output or accessible role

If there is no seam, the design is too coupled. Fix the seam first, not the test.

## Example

```ts
it('rejects an expired token', () => {
  const token = issue({ expiresAt: new Date('2026-01-01') });
  expect(verify(token, new Date('2026-01-02'))).toEqual({ ok: false, reason: 'expired' });
});
```

Then implement. Then add the boundary case:

```ts
it('accepts a token at its exact expiry instant', () => {
  const token = issue({ expiresAt: new Date('2026-01-01T00:00:00Z') });
  expect(verify(token, new Date('2026-01-01T00:00:00Z')).ok).toBe(true);
});
```

## Rules

- Control time, randomness, network, and filesystem.
- Test public behavior, not private helpers.
- Every bug fix starts with a test that fails for the right reason.
- One assertion concept per test; multiple assertions are fine when they describe one behavior.
- No sleeps for synchronization. Use events or a fake clock.
- No random tests without a seed.
- A flaky test is a bug; fix or quarantine it with an owner.

## Evidence

Record:

```text
RED:   <test name> failed because <reason>
GREEN: <test name> passed
Suite: <N> passed, 0 failed
```

A test that has never failed is not evidence.

## Coverage

- High coverage on domain rules, parsers, auth, and money.
- 100% on security-sensitive rejection paths.
- Do not chase coverage on glue code or generated code.
- Do not test implementation details.

## Anti-patterns

- Writing the implementation first, then a test that mirrors it.
- Asserting on logs instead of state.
- Mocking the thing you are trying to verify.
- Disabling a flaky test instead of fixing the nondeterminism.
- Testing a framework or a database driver.

## Handoff

Include the red/green evidence and the exact test command.

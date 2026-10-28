---
name: Core Systems
description: Implement domain logic, state machines, validation, persistence boundaries, and the primary user workflow. Use for the behavior that makes the product work.
metadata:
  origin: DAMM
---

# Core Systems

## Shape

Keep the core independent of UI, transport, and platform:

```text
input -> validate -> decide -> apply -> record -> emit result
```

The core should be runnable in a test with no window, server, or network.

## Domain rules

- Write the rule once, in one place.
- Validate at the edge; trust only values that passed validation.
- Make invalid states unrepresentable where practical.
- Errors are values with context, not silent defaults.
- Time, randomness, and I/O are injected so tests can control them.
- Persist only what is needed to reconstruct state; version the format.

## State machines

For any workflow with more than two states:

- list states and transitions
- name the event that triggers each transition
- define illegal transitions and what happens
- define timeout, retry, and cancellation
- make the current state observable

## Concurrency

- Prefer one owner per piece of mutable state.
- Pass messages or immutable snapshots across threads.
- Never block a UI or audio hot path on a lock.
- Bound every queue.
- Document the thread that owns each resource.

## Persistence

- Version the schema from the first release.
- Migrate forward; never silently discard data.
- Write atomically: temp file, fsync where needed, rename.
- Test corrupt, missing, and future-version data.

## Testing

- Test the rule table, not the implementation.
- Use deterministic seeds and a fake clock.
- Add a regression test for every bug.
- Property or fuzz tests for parsers and state transitions.

## Definition of done

- The workflow runs headlessly in a test.
- Every error path has a defined outcome.
- Persistence survives a round trip and a corrupt input.
- No UI or platform type leaks into the core.

## Handoff

Report changed files, commands and results, the state machine or rule table, and the next concrete step.

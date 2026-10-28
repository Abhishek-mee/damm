---
name: System Architecture
description: Define module boundaries, dependency direction, interfaces, ownership, and build structure for a software project. Use for design decisions, build failures, platform code, and foundation work.
metadata:
  origin: DAMM
---

# System Architecture

## Principle

Architecture is the set of decisions that are expensive to reverse. Make the few that matter, write them down, and leave the rest until evidence arrives.

## Boundaries

- Each module has one reason to change.
- Dependencies point inward: domain code does not import UI, transport, or platform types.
- Interfaces are owned by the caller-facing side and kept small.
- Cross-boundary data is explicit, validated, and versioned.
- Shared mutable state is a design smell; pass values or own a single coordinator.

## Ownership

For every interface, name:

- the owner (agent or human)
- the contract (inputs, outputs, errors, lifetime)
- the failure mode
- the test that proves it

If nobody owns it, it will rot.

## Build and platform

- A clean clone configures and builds with documented commands.
- Pin compilers, toolchains, and dependencies.
- Separate debug, release, and sanitizer builds.
- Keep platform-specific code behind a narrow interface.
- Build output stays out of the source tree.
- Warnings are errors for first-party code.

## Decisions

Record decisions that are expensive to reverse:

```text
docs/decisions/NNNN-title.md
- Status
- Context
- Decision
- Consequences
- Alternatives
```

Examples: language, runtime, database, save format, renderer API, threading model, dependency.

## Smells

- A "util" module that everything imports.
- Circular dependencies between packages.
- Framework types leaking into domain logic.
- A test-only abstraction that changes production behavior.
- An interface with one implementation and no plan for a second.

## Definition of done

- The boundary is documented and tested.
- A clean build passes.
- The failure modes are explicit.
- The decision record explains what gets harder, not only what gets easier.

## Handoff

Report changed files, commands and results, the decision made, and the next concrete step.

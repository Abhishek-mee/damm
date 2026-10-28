---
name: Product Spec
description: Turn an idea into a short, testable product spec with a user, a problem, a core flow, scope boundaries, and acceptance criteria. Use when defining or changing what gets built.
metadata:
  origin: DAMM
---

# Product Spec

## Stance

A spec is a decision tool, not a pitch deck. It should be short enough to read before starting and precise enough to test when finished.

## One page

Write these sections in order. If a section is unknown, write the question, not a guess.

1. **User** — who specifically has the problem?
2. **Problem** — what are they doing today, and where does it hurt?
3. **Promise** — one sentence: what becomes possible?
4. **Core flow** — the shortest path from opening the product to the promise.
5. **Non-goals** — what this version deliberately does not do.
6. **Acceptance** — observable results that prove the promise.
7. **Risks** — what could make this fail, and the cheapest test.

## Quality bar

- The user is a specific person or role, not "everyone".
- The problem names a current workaround, not a missing feature.
- The promise is testable without reading the implementation.
- The core flow has a start, an action, a result, and a recovery path.
- Non-goals are explicit enough to reject a plausible request.
- Acceptance criteria are observable by a non-author.

## Vertical slice

Prefer one complete slice over many partial features:

```text
one user -> one flow -> one result -> one feedback loop
```

A slice is done when a new person can complete it without a guide, and the failure path is handled.

## Lifecycle

- **Draft:** open questions dominate.
- **Accepted:** the director and owner commit to the scope.
- **Building:** changes need a note in the spec.
- **Shipped:** acceptance evidence is attached.
- **Superseded:** link the replacement; do not leave contradictions.

## Review questions

- What is the smallest version that proves the promise?
- What would make us cancel this?
- Which requirement is a guess? How will we test it?
- What existing behavior must not regress?

## Handoff

Report the spec path, the decisions made, open questions, and the next concrete step.

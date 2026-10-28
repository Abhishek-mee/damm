---
name: UX and Flows
description: Map user flows, states, information hierarchy, and interaction affordances before implementation. Use when designing a screen, onboarding, navigation, or recovery path.
metadata:
  origin: DAMM
---

# UX and Flows

## Start with the flow, not the screen

A flow is:

```text
entry -> intent -> action -> feedback -> next step -> exit or recovery
```

Write the flow in plain language before drawing anything. Name the user's intent at each step.

## Required states

Every surface needs an answer for:

- **empty** — no data yet, with a clear first action
- **loading** — what is happening and how long it may take
- **error** — what failed, whether it is recoverable, and what to do
- **partial** — some data is missing or stale
- **success** — confirmation and the next useful action
- **permission** — signed out, denied, or read-only
- **extreme** — long text, many items, tiny viewport, no network

A happy-path wireframe is not a design.

## Affordances

- The primary action is visually obvious and appears once per screen.
- Destructive actions are separated, labeled, and reversible where possible.
- Disabled controls say why.
- Focus order follows reading order.
- Keyboard and pointer paths reach the same outcome.
- Motion explains a change; it does not delay one.

## Accessibility

- Semantic structure first; ARIA only when semantics are insufficient.
- Contrast meets WCAG AA for text and meaningful UI.
- Never use color alone for status.
- Respect reduced motion and text scaling.
- Test with a keyboard and a screen reader for the primary flow.

## Content

- Name things the way the user names them.
- A button says what it does, not "submit".
- Errors say what happened, why, and the next action.
- Empty states teach, not apologize.

## Review

- Can a new person finish the main flow without help?
- Can they recover from the most likely mistake?
- Is there one obvious next step at every point?
- Does the flow survive a slow network and a small screen?

## Handoff

Report the flow diagram, state list, open questions, and the next concrete step.

---
name: Documentation
description: Write and maintain a truthful README, setup guide, ADRs, architecture notes, changelog, and runnable command examples. Use when setup or behavior changes, before a release, or when onboarding a new agent.
metadata:
  origin: DAMM
---

# Documentation

## Principle

Docs are part of the build. A command that does not run is a bug.

## README

Keep it:

- one paragraph explaining what this is and who it is for
- a quick start that works from a clean clone
- current status: what works, what does not, what is next
- a short map of the repo
- links to deeper docs
- no secrets, no private paths, no stale screenshots

Test every command before committing. If a step needs a prerequisite, say so before the command.

## Setup guide

- Number the steps; one command per step.
- State the expected result after each step.
- Cover Windows, macOS, and Linux, or say which is unsupported.
- Add a **last verified** date and the version you tested.
- Put troubleshooting at the bottom with the exact error text.

## ADRs

Use `docs/decisions/NNNN-title.md`:

```md
# NNNN: Title

- Status: proposed | accepted | superseded
- Date: YYYY-MM-DD
- Owners: <agent/human>

## Context
What forces are at play?

## Decision
What did we choose?

## Consequences
What gets easier, harder, or riskier?

## Alternatives
What did we reject and why?
```

Record decisions that are expensive to reverse: language, framework, database, persistence format, API shape, threading model, dependency.

## Architecture notes

- One diagram per major flow (boot, request, data load, background job).
- Name the owner of each interface.
- Document threading rules and lifetime.
- Link to code; do not paste large code blocks that will drift.

## Changelog

Keep `CHANGELOG.md` for user-visible changes:

```md
## [0.1.0] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
```

Do not list every commit. Write for the person upgrading.

## Commands

- Use the exact script names from `package.json` or the build file.
- Show the working directory when it matters.
- Prefer one shell per block; note the platform when it differs.
- Include expected output or a success condition.
- Never include a real key; use `<your-key>`.

## Maintenance

- Update docs in the same branch as the behavior change.
- Delete or mark superseded docs; do not leave contradictions.
- Add a "last verified" date to setup guides.
- If behavior and docs disagree, treat it as a bug and assign an owner.
- Prefer one working path over three half-tested paths.

## Handoff

Report which commands you actually ran and what changed in the docs.

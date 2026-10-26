---
name: Documentation
description: Write and maintain a truthful README, ADRs, architecture notes, changelog, and runnable command examples. Use when setup or behavior changes, before a release, or when onboarding a new agent.
metadata:
  origin: DAMM
---

# Documentation

## Principle

Docs are part of the build. A command that does not run is a bug.

## README

Keep it:

- one-paragraph explanation
- quick start that works from a clean clone
- current status (what is playable, what is not)
- links to deeper docs
- no secrets, no private paths, no stale screenshots

Test every command before committing.

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

Record decisions that are expensive to reverse: language, dependencies, save format, renderer API, threading model, asset pipeline.

## Architecture notes

- One diagram per major flow (boot, frame, asset load, input, audio).
- Name the owner of each interface.
- Document threading rules and lifetime.
- Link to code; do not paste large code blocks that will drift.

## Changelog

Keep `CHANGELOG.md` for player-visible changes:

```md
## [0.1.0] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
```

Do not list every commit.

## Commands

- Use the exact preset/script names.
- Show the working directory when it matters.
- Prefer PowerShell on Windows, with a POSIX note if needed.
- Include expected output or a success condition.
- Never include a real key; use `<your-key>`.

## Maintenance

- Update docs in the same branch as the behavior change.
- Delete or mark superseded docs; do not leave contradictions.
- Add a "last verified" date to setup guides.
- If behavior and docs disagree, treat it as a bug and assign an owner.

## Handoff

Report which commands you actually ran and what changed in the docs.

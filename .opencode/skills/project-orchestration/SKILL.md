---
name: Project Orchestration
description: Plan a product into small vertical slices, assign one specialist agent per lane, and integrate branches only with build/test evidence. Use when directing work, splitting a feature, resolving ownership, or deciding what to build next.
metadata:
  origin: DAMM
---

# Project Orchestration

## Goal

Ship a working slice, not a pile of half-finished systems. The director sequences work and protects the main branch.

## Slice template

Write this in `docs/roadmap.md` before delegating:

```text
Slice: <user-visible outcome>
Why: <which user problem it proves>
Owner: <one agent>
Lane: <paths>
Acceptance:
  - <testable behavior>
  - <build/test command>
Out of scope:
  - <explicit cuts>
Risk: <one thing that could derail it>
```

A slice should fit one agent and one worktree. If it needs two lanes, split it into two slices with an interface contract.

## Order of work

1. **Prove the path** — entry point, primary action, visible result, exit.
2. **Prove the rule** — one behavior, one failure state, one recovery.
3. **Prove the experience** — copy, layout, feedback, accessibility.
4. **Add breadth** — second flow or integration only after the first is solid.
5. **Polish** — performance, errors, empty states, docs.
6. **Ship** — packaging, install path, rollback, monitoring.

Do not start breadth before the primary path works.

## Delegation checklist

- [ ] The owner's lane covers every file the task needs.
- [ ] The task names the exact interface it may consume.
- [ ] The acceptance test is objective.
- [ ] The agent knows the build/test commands.
- [ ] The task is small enough for a free model (one system or one bug).
- [ ] A reviewer is assigned if the change touches memory, threads, parsing, auth, or networking.

## Integration checklist

- [ ] Handoff includes branch, files, commands, results, risks.
- [ ] `npm run worktree -- check <agent>` passes.
- [ ] `npm run validate` passes.
- [ ] Build passes from a clean state.
- [ ] Relevant tests pass.
- [ ] Diff is reviewed (use `reviewer` for risky work).
- [ ] Docs/roadmap updated.
- [ ] Merge is `--no-ff`; history is readable.
- [ ] Human knows what works now.

## Conflict resolution

- Shared file: the owner edits, the requester supplies the requirement.
- Interface disagreement: write the contract in `docs/architecture/` or an ADR, then implement.
- Two agents need the same behavior: one owns it, the other calls it. No duplicate systems.
- A merge conflict is never resolved by deleting the other side. Re-read both intents, then ask the owners.

## Free-model task sizing

Free models do better with:

- one file or one small module
- explicit input/output examples
- a short list of allowed commands
- a clear "stop and report" condition

Split tasks that need more than ~5 files or more than one interface change.

## Parallelism

Run at most 2–4 agents at once. Each agent gets its own worktree and lane. Merge one branch at a time, rebuild after each merge, and never let two agents edit the same shared file. See `docs/PARALLEL.md`.

## Reporting

Keep the human oriented:

```text
Now working: <one sentence>
Merged: <branches>
In flight: <branches + owners>
Next: <one slice>
Blocked by: <nothing | item>
```

# Roadmap

DAMM is a workspace, not a product. The roadmap tracks the workspace itself; your project's roadmap belongs in your project.

Each phase ends with something verifiable. Do not start a phase before the previous acceptance criteria pass.

## Phase 0 — Foundation (done)

- [x] 11 agents with narrow ownership lanes
- [x] 17 reusable skills
- [x] Free OpenRouter model assignments
- [x] Git worktrees + ownership checks
- [x] Secret policy and validation
- [x] One-command setup and CI

**Acceptance:** `npm run validate` and `npm run doctor` pass from a clean clone.

## Phase 1 — Parallel by default (current)

- [ ] `npm run attach -- <project>` installs the kit into any git repository
- [ ] Worktree commands operate on the attached project
- [ ] `npm run fanout` runs 2–4 agents from a task file, dry-run by default
- [ ] Per-agent branch, lane, and handoff are visible in one status view
- [ ] Recovery path for a failed or rate-limited agent run

**Acceptance:** a fresh clone can attach to an unrelated repository, run two agents in parallel, and merge both without a lane violation.

## Phase 2 — Reliable free models

- [ ] `npm run check-models` passes on the default roster
- [ ] Automatic fallback to `openrouter/free` when a model is unavailable
- [ ] A failed tool call is retried once with a shorter prompt, then reported
- [ ] Model assignments are easy to swap per role

**Acceptance:** a full fanout run completes on free models without manual retries.

## Phase 3 — Review and integration

- [ ] `npm run worktree -- merge` runs the project's build and tests before merging
- [ ] Reviewer agent produces a structured verdict on a diff
- [ ] Merge queue: one branch at a time, rebuild after each
- [ ] Conflict ownership is routed automatically to the file owner

**Acceptance:** two agents change different lanes; both merge; the project still builds.

## Phase 4 — Adoption

- [ ] `examples/game/` shows a complete C++/SDL3 mapping
- [x] `examples/web/` shows a TypeScript mapping
- [ ] Templates for a new lane map (`damm.config.json`)
- [ ] Video/GIF quick start in the README
- [ ] At least one external project using the kit

**Acceptance:** someone who has never seen DAMM can attach it to their repo and get a merged agent PR in under 15 minutes.

## Phase 5 — Distribution

- [ ] `npx damm attach` style entry point
- [ ] Versioned kit with a changelog
- [ ] Upgrade path that preserves local lane edits
- [ ] Community gallery of lane maps

**Acceptance:** upgrading the kit does not overwrite a project's `damm.config.json`.

## Next action

1. Human: add `OPENROUTER_API_KEY` to `.env.local` and run `npm run check-models`.
2. Director: run `npm run setup`, then `npm run doctor`.
3. Director: attach DAMM to one real project and open two worktrees.
4. Director: run the first fanout with `--dry-run`, then for real with two agents.

The live task list is the issue tracker. This file records direction, not every ticket.

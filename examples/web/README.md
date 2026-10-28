# Example: a TypeScript web app

This folder is one worked example of mapping DAMM's generic agents to a specific product. It is **not** the repository's purpose, and nothing here is required to use the workspace.

The example project: a TypeScript web app in a pnpm workspace. The UI is a Next.js App Router app in `apps/web`, shared React components live in `packages/ui`, and business rules live in `packages/domain`. End-to-end tests live in `tests/e2e`. It is the usual shape of a web repo, and it does not match DAMM's default lanes (`src/core`, `src/frontend`, `web/`, `shaders/`).

Copy [`damm.config.json`](damm.config.json) to the root of that repository. The `$schema` path in this copy points at DAMM's schema. After you copy the file, either drop `$schema` or set it to `./damm.schema.json` next to your copy of the schema.

## Lane map

Each path has one owner. `reviewer` is empty on purpose: that agent reads diffs and does not edit.

| Agent | In this example |
| --- | --- |
| `director` | Scope, roadmap, merge decisions |
| `architect` | Workspace TypeScript config, package boundaries, ADRs |
| `frontend` | Next.js routes, app shell, shared React UI |
| `core` | Domain types and business rules, including their unit tests |
| `media` | Brand images, fonts, and icons |
| `tools` | Workspace scripts, lockfile, CI, and infra |
| `designer` | Flows, tokens, and the product spec |
| `qa` | Playwright end-to-end tests, fixtures, and helpers |
| `reviewer` | Read-only diff review before merge |
| `performance` | Benchmark scripts and the web-vitals budget |
| `docs` | Setup guides and the changelog |

Unit tests sit next to the package they cover, so the code owner keeps them. A test under `packages/domain/src/` belongs to `core`. A test under `packages/ui/src/` or `apps/web/app/` belongs to `frontend`. `qa` owns only the cross-app Playwright suite.

Route handlers under `apps/web/app/` belong to `frontend`. They call `packages/domain`. They do not grow a second copy of the business rules.

These paths are intentionally unowned. Do not add them to a lane:

- secrets: `.env`, `.env.*`
- install and build output: `node_modules/`, `apps/web/.next/`, `apps/web/out/`, `packages/*/dist/`, `coverage/`, `.turbo/`
- browser-test output: `test-results/`, `playwright-report/`

## Reading order

1. [`STACK.md`](STACK.md) — the TypeScript / Next.js baseline and the directory layout
2. [`damm.config.json`](damm.config.json) — the lane map to copy
3. [`../../docs/ATTACH.md`](../../docs/ATTACH.md) — point DAMM at the web repository
4. [`../../docs/WORKTREES.md`](../../docs/WORKTREES.md) — isolation and merge rules
5. [`../../docs/PARALLEL.md`](../../docs/PARALLEL.md) — running the team at once

## What to copy

- The **shape** of the lanes: one owner per path, and an empty `reviewer`.
- The **split** between `apps/web`, `packages/ui`, `packages/domain`, and `tests/e2e`.
- The **handoff**: files, commands, results, risks.

## What not to copy

- The specific paths, if your app is not this layout.
- The build commands, unless you use pnpm and Next.js.
- The model assignments, if a different model works better for your task.

The workspace is the product. This example is a demonstration.

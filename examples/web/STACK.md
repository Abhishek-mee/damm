# Example stack: TypeScript / Next.js

This is the stack for the example web app described in [`README.md`](README.md). It is **not** a requirement for DAMM. The workspace is language-agnostic.

The lanes that match this layout are in [`damm.config.json`](damm.config.json). This file exists so the toolchain and the directory tree are not buried in that table.

## Target

| Area | Choice |
| --- | --- |
| Language | TypeScript, `strict` |
| UI | React on the Next.js App Router |
| Workspace | pnpm |
| App | `apps/web` |
| Shared UI | `packages/ui` |
| Domain | `packages/domain` — no React imports |
| Unit tests | Vitest, colocated under the owning package |
| End-to-end tests | Playwright, in `tests/e2e` |
| Lint and format | ESLint and Prettier. `architect` owns `eslint.config.js`, `prettier.config.js`, and `packages/config` |
| Node | Current Active LTS, pinned in `.nvmrc` |

A Vite + React app uses the same agent split. Point `frontend` at the Vite app directory instead of `apps/web/app/**`, and keep `packages/domain` and `tests/e2e` as they are.

## Proposed layout

```text
apps/web/
  app/                 routes, layouts, route handlers, app-local tests
  public/              files served as-is
  middleware.ts
  next.config.ts
  postcss.config.mjs
  package.json
  tsconfig.json
packages/ui/
  src/                 shared React components and their unit tests
  package.json
  tsconfig.json
packages/domain/
  src/                 types, rules, and their unit tests
  package.json
  tsconfig.json
packages/config/
  eslint.js
  tsconfig.json
  package.json
assets/
  images/
  fonts/
  icons/
design/
  flows/
  tokens/
docs/
  roadmap.md
  architecture/
  decisions/
  design/
  guides/
  perf/
tests/
  e2e/
  fixtures/
  helpers/
benchmarks/            *.mjs scripts only
scripts/
infra/
.github/
package.json           tools
pnpm-lock.yaml         tools
pnpm-workspace.yaml    architect
tsconfig.base.json     architect
eslint.config.js       architect
prettier.config.js     architect
vitest.config.ts       tools
playwright.config.ts   qa
.nvmrc                 tools
.gitignore             tools
```

`apps/web/.next/`, `apps/web/out/`, and `packages/*/dist/` are build output. They are not in the tree above and they are not in any lane. The same is true of `node_modules/`, `coverage/`, `.turbo/`, `test-results/`, and `playwright-report/`.

## Expected commands

These run in the web repository, once that repository exists. They do not run in the DAMM checkout. This folder does not scaffold the app.

```bash
pnpm install
pnpm exec tsc -p tsconfig.base.json --noEmit
pnpm exec vitest run
pnpm exec playwright test
pnpm --filter web build
```

`pnpm --filter web build` writes `apps/web/.next/`. That directory stays gitignored and unowned.

## Coding rules

- `packages/domain` does not import React, Next.js, or `packages/ui`.
- Route handlers in `apps/web/app/` validate input, call domain functions, and return a response. Business rules stay in `packages/domain`.
- Shared components in `packages/ui` do not fetch data and do not import `packages/domain` server code.
- Environment variables are read from the process environment. `.env` files are never committed and never added to a lane.
- Do not edit `next-env.d.ts` or anything under `.next/`.

## Testing rules

- A unit test lives beside the module it covers and is owned by that module's agent.
- Playwright covers a user flow that crosses the UI and the domain. Those tests live in `tests/e2e` and belong to `qa`.
- Fixtures live in `tests/fixtures`. Helpers live in `tests/helpers`. Neither is a second copy of domain code.
- A regression test accompanies a bug that can be reproduced in a unit or end-to-end test.

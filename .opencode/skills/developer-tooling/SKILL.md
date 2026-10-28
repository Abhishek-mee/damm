---
name: Developer Tooling
description: Build CI, setup scripts, containers, caches, and release automation that make a repository fast to clone, test, and ship. Use for developer experience, pipelines, and packaging.
metadata:
  origin: DAMM
---

# Developer Tooling

## One-command contract

Every repository should have exactly one obvious command for:

- setup
- test
- lint and format
- build
- release

If a command needs five prerequisites, the setup command is not finished.

## CI

- Fail fast. Run cheap checks before expensive builds.
- Run independent jobs in parallel.
- Pin action versions and container digests.
- Cache only reproducible inputs; a cache miss must still pass.
- Upload logs and artifacts on failure.
- Never expose secrets in logs, artifacts, or cache keys.
- Required checks are documented and stable.

## Scripts

- Idempotent: run twice, same result.
- Fail loudly with the command, the cause, and the next action.
- No hidden global state; take paths as arguments.
- Cross-platform or explicitly documented as platform-specific.
- Dry-run mode for anything destructive.
- Never print environment variables wholesale.

## Containers

- Small, pinned base images.
- One process per container.
- Non-root user.
- Read-only filesystem where possible.
- Health check and graceful shutdown.
- Build cache layers ordered from least to most volatile.

## Release

- Version from a single source of truth.
- Build once, promote the same artifact.
- Sign or checksum artifacts.
- Keep a changelog written for users.
- Test the install path on a clean machine.
- Tag and notes are generated from the changelog.

## Security

- Least-privilege tokens.
- No long-lived credentials in CI.
- Pin dependencies and review updates.
- Use Dependabot or equivalent for actions and packages.

## Definition of done

- A clean clone runs setup and tests with the documented commands.
- CI is green and required.
- Failure output is actionable.
- No secret is exposed.

## Handoff

Report commands and results, CI link, changed files, and the next concrete step.

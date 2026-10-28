# Contributing to DAMM

Thanks for helping. DAMM is a workspace for parallel AI agents; the contribution rules are designed so several people (and several agents) can work at once without stepping on each other.

## Before you start

1. Read [`README.md`](README.md) and [`docs/WORKTREES.md`](docs/WORKTREES.md).
2. Run `npm run setup`.
3. Pick a lane. If your change crosses lanes, split it or open an issue first.

## The short version

```bash
git clone https://github.com/Abhishek-mee/damm.git
cd damm
npm run setup
git switch -c feat/<short-name>
```

Make the change, then:

```bash
npm run validate
npm run doctor
git add <only your files>
git commit -m "type(scope): why"
```

Open a pull request. Describe the change, the commands you ran, and the result.

## What we accept

| Change | Welcome |
| --- | --- |
| New skill with a concrete definition of done | yes |
| New agent with a disjoint lane | yes |
| Better lane map for a common stack | yes |
| Setup, docs, or troubleshooting fix | yes |
| New dependency | only with an ADR and a clear need |
| Reformatted unrelated files | no |
| A model swap that breaks the free tier | no |

## Rules

- **One lane per change.** Do not edit another agent's lane to make yours work.
- **Evidence over claims.** Paste the command and the result.
- **Small diffs.** One behavior, one bug, or one doc per pull request.
- **No secrets.** Never commit `.env.local`, a key, a token, or a private path.
- **No engine or framework that owns the product.** DAMM stays low-level and portable.
- **Keep the roster honest.** If you add an agent, add its lane, its docs row, and a skill reference.

## Adding an agent

1. Create `.opencode/agents/<name>.md` with `description`, `mode`, `model`, `steps`, and `permissions`.
2. Start permissions with `edit "*" deny`, then allow only the lane.
3. Add the lane to `damm.config.json`.
4. Add the agent to `AGENTS.md` and `docs/AGENTS.md`.
5. Reference at least one existing skill in the prompt.
6. Run `npm run validate` and `npm run check-models`.

## Adding a skill

1. Create `.opencode/skills/<id>/SKILL.md`.
2. Frontmatter: `name`, `description` (40–1024 chars), `metadata.origin`.
3. Body: when to use it, concrete rules, a definition of done, a handoff.
4. Reference it from at least one agent.
5. Run `npm run validate`.

## Commit messages

```text
type(scope): why this change exists
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `chore`, `ci`.

Good: `fix(worktree): refuse merge when the base checkout is dirty`

Bad: `update files`

## Pull request checklist

- [ ] The change is inside one lane.
- [ ] `npm run validate` passes.
- [ ] `npm run doctor` shows no new blocking problem.
- [ ] New behavior has a test or a documented manual check.
- [ ] Docs are updated in the same pull request.
- [ ] No secret, build output, or absolute local path is included.
- [ ] The description names the commands run and their results.

## Review

A reviewer checks, in order: correctness, safety, concurrency, error handling, design, tests, performance, security. Read the [`code-review`](.opencode/skills/code-review/SKILL.md) skill for the exact bar.

## Code of conduct

By participating you agree to [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Security

Do not open a public issue for a vulnerability. See [`SECURITY.md`](SECURITY.md).

## License

Contributions are MIT. See [`LICENSE`](LICENSE).

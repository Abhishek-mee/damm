# Security policy

## Supported versions

DAMM is pre-1.0. Security fixes land on `main`; there are no maintained release branches yet.

## Reporting a vulnerability

Do not open a public issue.

- Use GitHub's private vulnerability reporting on the repository if it is enabled.
- Otherwise contact the maintainer listed on the repository profile.

Include:

- what is affected (workspace scripts, agent kit, a skill, CI)
- reproduction steps
- the impact you can demonstrate
- the version or commit

You will get an acknowledgement, a severity assessment, and a fix or mitigation. Please give us time to ship a fix before publishing details.

## Scope

In scope:

- the worktree, ownership, attach, and fanout scripts
- the agent kit installer and its `.git/info/exclude` handling
- CI workflows and token permissions
- secret handling in the workspace
- prompt or configuration paths that let an agent escape its lane

Out of scope:

- the quality or safety of a third-party model's output
- OpenRouter, OpenCode, git, or Node vulnerabilities (report upstream)
- a user committing their own key

## Secrets

`.env.local` is gitignored and denied to agents. If a key is committed or printed:

1. Revoke it at the provider immediately.
2. Remove it from history; a new commit is not enough.
3. Tell the maintainers if it reached this repository.

## Agent-specific risks

DAMM runs language models with edit and shell access. Treat it as you would a new contributor:

- The lane check limits *where* an agent writes; it does not prove the code is correct.
- The reviewer is a model, not a guarantee. Read risky diffs yourself.
- `git push`, destructive resets, and cross-directory access require approval in the default config.
- The agent kit is local-only by default; do not commit it into a repository with different trust rules.
- Fanout logs may contain file contents. They live in `.damm/`, which is gitignored.

## Hardening checklist

- [ ] Keep the default permission denies for `.env*`, keys, and `.git`.
- [ ] Review `damm.config.json` before attaching to a new project.
- [ ] Do not run `fanout --run` against a repository you do not trust.
- [ ] Pin CI actions and keep `permissions: contents: read`.
- [ ] Rotate any key that appears in a log, screenshot, or issue.

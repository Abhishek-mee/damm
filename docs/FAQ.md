# FAQ

## Is DAMM a game project?

No. DAMM is a multi-agent workspace. Game development is one example, kept in `examples/game/`. The same agents work on a web app, a CLI, a library, or a data pipeline.

## Do I have to use OpenCode?

The agent files, skills, lanes, and worktree scripts are plain files. The defaults target OpenCode because that is what the runner starts. Another harness can read `DAMM.md` and the agent files, but `npm run fanout --run` calls `opencode run`.

## Do I have to pay for models?

No. Every assigned model is an OpenRouter `:free` model, and the fallback is `openrouter/free`. Free models are slower and rate-limited. If you have credit, swap the `model:` line in an agent file.

## Where does the API key go?

`.env.local`, which is gitignored and denied to agents. Never in source, docs, issues, or commit messages. `.env.example` keeps the empty key name.

## How do agents avoid overwriting each other?

Three layers:

1. **Worktrees** — each agent has its own directory and branch, so uncommitted work is invisible to the others.
2. **Lanes** — each agent's `permissions` block allows edits only inside its lane.
3. **Pre-merge check** — `npm run worktree -- check` reads the full diff and fails on any out-of-lane file.

The merge is serialized: one branch at a time, with a clean base checkout.

## Can two agents edit the same file?

Only if you widen the lanes. The default code lanes are disjoint, and validation warns when they overlap. If two agents genuinely need the same file, give it one owner and have the other request the change.

## How do I use this on my project?

```bash
npm run attach -- ../my-project
npm run worktree -- new core
```

See [`ATTACH.md`](ATTACH.md). The kit is installed locally and excluded from the target's history.

## Does attach modify my repository?

It adds untracked files (`.opencode/agents`, `.opencode/skills`, `DAMM.md`) and one block in `.git/info/exclude`. It never edits tracked files and never overwrites an existing kit file.

## How many agents can run at once?

Two to four. Free models are rate-limited and long queues hide failures. Start with two independent lanes.

## What happens when a model fails?

The task is reported as failed and its log is kept. Nothing is merged. Retry with `--only <id>`, or swap the model and re-run `npm run check-models`.

## Why are there 17 skills for 11 agents?

Skills are reusable procedures, not roles. `testing` is used by seven agents; `code-review` only by the reviewer. Each skill has a definition of done, so a small model has a checklist instead of a vague prompt.

## Can I add an agent?

Yes. Add `.opencode/agents/<name>.md`, add its lane to `damm.config.json`, add the lane to `AGENTS.md`, and run `npm run validate`. The validator checks that the permissions stay inside the lane.

## Can I rename an agent?

Yes, but branches cannot be renamed while checked out. Create the new worktree first, merge the old work, then remove the old worktree and branch.

## Where are the logs?

`.damm/logs/<task-id>.log` in the workspace. `.damm/` is gitignored.

## Why does `merge` refuse when the base checkout is dirty?

A merge into a dirty tree mixes your uncommitted work with the agent's branch. Commit or stash first. This is deliberate.

## Is this production-ready?

The workspace is. The default lanes are a starting point; adapt them to your repository. The honest status is in [`roadmap.md`](roadmap.md).

## How do I uninstall?

```bash
npm run detach
git worktree list
git worktree remove <path>
```

Then delete `damm.local.json`, `.damm/`, and the worktree directories. In an attached project, delete `.opencode/agents`, `.opencode/skills`, and `DAMM.md`.

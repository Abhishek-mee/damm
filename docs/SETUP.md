# Setup

Last verified: 2026-10-28 on Windows 11 with Node 22 and git 2.47.

## Requirements

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20 or newer | runs the workspace scripts |
| git | 2.30 or newer | worktrees and branches |
| OpenCode | current | the agent runtime |
| OpenRouter key | free account | the models are `:free` |

No `npm install` is needed. DAMM has zero runtime dependencies.

## 1. Clone and run setup

```bash
git clone https://github.com/Abhishek-mee/damm.git
cd damm
npm run setup
```

`setup` checks Node and git, creates `.env.local` from the template, validates the roster and lanes, and prints the next step. It is safe to re-run and never overwrites `.env.local`.

Expected ending:

```text
Setup complete. The workspace is ready; attach a project or open a worktree.
```

## 2. Add your OpenRouter key

Create a free key at <https://openrouter.ai/keys>, then edit `.env.local`:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
```

`.env.local` is gitignored and denied to agents. Never paste the key into a prompt, an issue, or a commit.

Connect the provider once inside OpenCode:

```text
/connect -> OpenRouter
```

## 3. Test the models

```bash
npm run check-models
```

This sends a small tool-call request to every assigned model. Free models are rate-limited; a failure here usually means "try again later" or "swap this one model". The fallback is `openrouter/free`.

## 4. Create a worktree

```bash
npm run worktree -- new core
```

Open the printed folder in OpenCode and select the matching agent. The main checkout stays clean.

To create every worktree:

```bash
npm run setup:worktrees
```

## 5. Or attach your own project

```bash
npm run attach -- ../my-project
npm run worktree -- new core
```

`attach` installs the agent kit into the target, points the worktree commands at it, and keeps the kit out of the target's git history. Full flow: [`ATTACH.md`](ATTACH.md).

## 6. Run agents in parallel

```bash
cp damm.tasks.example.json damm.tasks.json
npm run fanout -- --tasks damm.tasks.json          # dry run
npm run fanout -- --tasks damm.tasks.json --run    # execute
```

Start with two tasks. Free models degrade when you push past four concurrent sessions. Full flow: [`PARALLEL.md`](PARALLEL.md).

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run setup` | check the workspace |
| `npm run doctor` | environment report and next step |
| `npm run validate` | config, roster, lanes, secrets, scripts |
| `npm run check-models` | live tool-call test for every model |
| `npm run worktree -- list` | worktree state |
| `npm run worktree -- new <agent>` | create one worktree |
| `npm run worktree -- check <agent>` | lane check |
| `npm run worktree -- merge <agent>` | check, test, merge |
| `npm run attach -- <path>` | use DAMM on another repo |
| `npm run detach` | return to this repo |
| `npm run fanout -- --tasks <file>` | parallel run |

## Troubleshooting

### `npm run worktree -- new` says the main checkout is dirty

Commit or move the changes first. The control plane must be clean so the worktree starts from a known commit.

### `opencode` is not found during fanout

The interactive app can run without the CLI. `fanout --run` needs it:

```bash
npm install -g opencode-ai
# or set the full path
$env:DAMM_OPENCODE_BIN = "C:\path\to\opencode.exe"
```

Dry runs work without the CLI.

### A free model fails

Retry once with a shorter task. If it still fails, change the `model:` line in the agent file and run `npm run check-models`. See [`FAQ.md`](FAQ.md).

### The ownership check fails

The agent edited a file outside its lane. Move the change to the owning agent, or revert it. Do not widen the lane to make the check pass.

### Worktree already exists

Use it. Do not delete it to "start clean" unless the work is merged:

```bash
npm run worktree -- list
```

### Windows path issues

Run the commands from PowerShell in the repository root. Worktrees are created as siblings of the repository, not inside it.

## Uninstall

DAMM writes only inside the workspace, except when attached:

- `damm.local.json` — local attach state (gitignored)
- `.damm/` — fanout logs and prompts (gitignored)
- worktree directories — siblings of the repository

Delete those and the worktrees are gone. The agent kit inside an attached project lives in `.opencode/agents`, `.opencode/skills`, and `DAMM.md`, and is listed in `.git/info/exclude`.

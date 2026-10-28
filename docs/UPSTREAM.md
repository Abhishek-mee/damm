# Upstream projects

The projects below are **references**, not vendored dependencies. This keeps the workspace small and avoids license surprises. Add one only when your project needs it, in its own worktree, with an ADR.

| Project | License | What it gives DAMM | Status |
| --- | --- | --- | --- |
| [ECC](https://github.com/affaan-m/ECC) | MIT | Agent/skill patterns, verification and review workflows | **Adapted** — see `THIRD_PARTY_NOTICES.md` |
| [graphify](https://github.com/Graphify-Labs/graphify) | Apache-2.0 | File/folder to knowledge graph, wiki, graph queries | Optional; needs Claude/Anthropic today |
| [memvid](https://github.com/memvid/memvid) | Apache-2.0 | Single-file long-term memory for agents | Optional; not wired yet |
| [RAG_Techniques](https://github.com/NirDiamant/RAG_Techniques) | Apache-2.0 | RAG patterns for search, dialogue, tooling | Reference only |
| [langfuse](https://github.com/langfuse/langfuse) | MIT (core) | Tracing, prompt management, evals | Optional; needs keys/Docker |
| [ragas](https://github.com/vibrantlabsai/ragas) | Apache-2.0 | RAG evaluation metrics | Optional; Python |

## ECC

ECC is an agent-harness operating system with 71 agents and 311 skills. DAMM does not install all of it. Instead, the roster and several skills adapt ECC's workflow ideas:

- test-first and verification loops
- severity-ordered review
- security review for input/parsing/secrets
- explicit handoffs and evidence
- ownership and small-diff discipline

The ECC license is included at `licenses/ECC-LICENSE.txt`.

If you want the full ECC catalog in a **separate** environment, follow its installer. Do not stack it on top of this project config:

```powershell
npx ecc-universal@2.2.3 install --guided
```

Review the target and scope before confirming. ECC supports Claude Code, Codex, Kimi Code, and managed adapters for other harnesses; this workspace uses its own OpenCode-native agent files.

## graphify

graphify is a **Claude Code skill**. It uses Claude vision to extract concepts from code, PDFs, screenshots, and diagrams into a persistent graph under `graphify-out/`.

It is not enabled because:

- it expects Claude Code and an Anthropic key
- DAMM currently uses free OpenRouter models
- `graphify-out/` would need to be ignored and reviewed

To evaluate it later:

```powershell
pipx install graphifyy
# in a separate worktree, with ANTHROPIC_API_KEY set
graphify install
```

Add `graphify-out/` to `.gitignore` before running. Adapting it to OpenRouter would require replacing its Claude-specific calls; treat that as a separate project.

## memvid

memvid packages content, embeddings, search structures, and metadata into a single file. It is a good fit for persistent agent memory or a knowledge store.

It is not wired because the workspace has no memory requirement yet. When it does:

- pin a release
- decide the binding (Python or Rust)
- store the memory file under `data/memory/` (gitignored or LFS)
- add a worktree and an ADR

## RAG_Techniques

A notebook collection of RAG patterns: chunking, hybrid search, reranking, query translation, evaluation.

Use it as a **reference for design**, not as a runtime dependency. If your product adds retrieval:

1. write the retrieval design in `docs/design/`
2. keep the runtime and the offline indexing tool separate
3. evaluate with ragas before shipping
4. do not copy notebook code without checking its license and quality

## langfuse

Langfuse traces LLM calls, prompts, and evaluations. Useful if your product adds AI features or you want agent telemetry.

Optional self-host:

```powershell
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up -d
```

Then set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST` in `.env.local`. Never commit them. This is not part of the product runtime unless the product actually calls an LLM.

## ragas

Ragas evaluates retrieval-augmented generation pipelines. It is Python-only.

Use it only if the product adds a RAG feature. Keep evaluation scripts under `tools/eval/` (owned by `tools`) or a dedicated worktree. Do not add Python to the product runtime.

## Adding an upstream safely

1. Create a worktree: `npm run worktree -- new tools` (or the right owner).
2. Write an ADR in `docs/decisions/` with: need, alternatives, license, pin, security, exit plan.
3. Pin a commit/tag. Never track `main`.
4. Add the license to `licenses/` and update `THIRD_PARTY_NOTICES.md`.
5. Keep secrets in `.env.local`.
6. Run `npm run validate` and the relevant build/tests.
7. Merge through the director.

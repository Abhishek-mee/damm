---
name: Security Review
description: Threat-model a game's save files, asset parsers, network, mods, and secrets, and check C++ memory safety and supply-chain risk. Use before shipping any code that reads untrusted data or talks to a network.
metadata:
  origin: DAMM
---

# Security Review

## Threat model

Ask:

- What data comes from outside the process? (save files, levels, mods, network, clipboard, launch args, env)
- Who can modify it?
- What is the worst outcome? (code execution, crash, data loss, cheating, key leak)
- Is the game single-player, local co-op, or networked?

## High-risk areas

| Area | Risks |
| --- | --- |
| Save/load | path traversal, unbounded lengths, type confusion, version downgrade |
| Asset parsers | malformed PNG/OGG/glTF, integer overflow, OOM |
| Level/mod data | script injection, path escape, arbitrary file read |
| Network | unauthenticated messages, replay, desync, amplification |
| Update/download | unsigned payloads, MITM, zip slip |
| Secrets | key in repo/logs/build artifacts |
| Dependencies | typosquat, unpinned tag, abandoned package |

## C++ checks

- Validate every length/count before allocation or indexing.
- Check `size * element_size` for overflow.
- Reject unknown versions and trailing data explicitly.
- Bound recursion and decompression output.
- Never `reinterpret_cast` untrusted bytes into a struct.
- Canonicalize paths and reject `..`, absolute paths, and symlinks.
- Do not trust `Content-Length`, dimensions, sample rates, or chunk sizes.
- Use a checked parser or a well-tested library; still fuzz the boundary.
- Clear secrets from memory only if the threat model warrants it; never log them.

## Network checks

- Authenticate messages; do not trust client state.
- Rate-limit and bound message sizes.
- Use TLS for anything public.
- Validate sequence numbers and timestamps.
- Do not roll custom crypto.
- Log security events without secrets.

## Supply chain

- Pin dependencies to tags/commits with hashes.
- Review new dependencies for license, maintenance, and transitive weight.
- Do not run install scripts blindly.
- Keep CI tokens minimal.
- Scan for secrets before push.

## Secrets

- `.env.local` is gitignored and denied to agents.
- Never put a key in a command line (shell history), screenshot, or issue.
- Rotate a key if it appears in output.
- Use environment variables at runtime, not compiled constants.

## Output

```text
Threat: <asset/save/network>
Finding: [severity] file:line
Impact:
Reproduction:
Fix:
Verification:
```

If there is no finding, state what you checked and what remains untested.

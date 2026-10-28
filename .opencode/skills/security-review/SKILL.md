---
name: Security Review
description: Threat-model untrusted input, persistence, network, dependencies, and secrets, then check the code paths that handle them. Use before shipping anything that reads outside data or talks to a network.
metadata:
  origin: DAMM
---

# Security Review

## Threat model

Ask:

- What data comes from outside the process? (files, requests, uploads, config, environment, launch args, clipboard, third-party APIs)
- Who can modify it, and what do they gain?
- What is the worst outcome? (code execution, data loss, account takeover, key leak, denial of service)
- What is the trust boundary, and where is it enforced?

Write the answers down. A review without a boundary is a vibe check.

## High-risk areas

| Area | Risks |
| --- | --- |
| File parsing | path traversal, unbounded lengths, type confusion, version downgrade |
| Serialization | unsafe deserialization, prototype pollution, integer overflow, OOM |
| Uploads and media | malformed files, decompression bombs, content-type spoofing |
| Auth | weak session handling, missing expiry, privilege escalation, replay |
| Network | unauthenticated messages, injection, SSRF, amplification |
| Dependencies | typosquat, unpinned tag, abandoned package, install scripts |
| Secrets | key in repo, logs, build artifacts, error messages, screenshots |
| CI/CD | over-privileged token, untrusted PR code with secrets, cache poisoning |

## Code checks

- Validate every length, count, and index before allocation or access.
- Check `size * element_size` for overflow.
- Reject unknown versions and trailing data explicitly.
- Bound recursion, decompression output, and request body size.
- Never cast untrusted bytes into a trusted structure.
- Canonicalize paths and reject `..`, absolute paths, and symlinks.
- Do not trust `Content-Length`, dimensions, durations, or client state.
- Use a maintained parser; still fuzz the boundary.
- Parameterize queries; never build SQL or shell commands from input.
- Escape output for its context (HTML, SQL, shell, URL).
- Never log secrets, tokens, or full request bodies with credentials.

## Network checks

- Authenticate and authorize every request; do not trust client state.
- Rate-limit and bound message sizes.
- Use TLS for anything public.
- Validate signatures, sequence numbers, and timestamps.
- Do not roll custom crypto.
- Log security events without secrets.
- Fail closed on auth and parsing errors.

## Supply chain

- Pin dependencies to versions with a lockfile or hash.
- Review new dependencies for license, maintenance, and transitive weight.
- Do not run install scripts blindly.
- Keep CI tokens minimal and scoped.
- Scan for secrets before push; rotate anything that leaked.
- Enable Dependabot or equivalent for actions and packages.

## Secrets

- `.env.local` is gitignored and denied to agents.
- Never put a key in a command line (shell history), screenshot, or issue.
- Rotate a key if it appears in output.
- Use environment variables at runtime, not compiled constants.
- Redact before sharing logs.

## Output

```text
Threat: <asset/save/network/dependency>
Finding: [severity] file:line
Impact:
Reproduction:
Fix:
Verification:
```

If there is no finding, state what you checked and what remains untested. "No findings" without a scope is not a result.

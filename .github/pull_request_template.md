## What changed

<!-- One paragraph. What is different for the user? -->

## Why

<!-- The problem, not the implementation. Link the issue if there is one. -->

## Lane

<!-- Which agent lane owns this change? director, architect, frontend, core, media, tools, designer, qa, reviewer, performance, docs -->

- Agent: `<name>`
- Files: `<paths>`

## Verification

```text
Built:  <command> -> pass/fail
Tested: <command> -> pass/fail
Lane:   npm run worktree -- check <agent> -> pass/fail
```

## Checklist

- [ ] The change is inside one lane.
- [ ] `npm run validate` passes.
- [ ] New behavior has a test or a documented manual check.
- [ ] Docs are updated in the same pull request.
- [ ] No secret, build output, or absolute local path is included.
- [ ] The diff is small enough to review in one pass.

## Risks

<!-- What could still break? What did you not test? -->

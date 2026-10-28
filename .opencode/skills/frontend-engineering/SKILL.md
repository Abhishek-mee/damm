---
name: Frontend Engineering
description: Build accessible, responsive interfaces and rendering layers, from component structure to GPU draw calls. Use for screens, components, styling, input, shaders, and visual output.
metadata:
  origin: DAMM
---

# Frontend Engineering

## Structure

- One screen = one composition of small components.
- Separate data fetching, state, and presentation.
- Keep interaction state close to the interaction; keep shared state explicit.
- Prefer server-rendered or static content when it is sufficient.
- Do not put domain rules in components.

## Accessibility baseline

- Semantic elements first. Add ARIA only when no element expresses the meaning.
- Every control is reachable and operable by keyboard.
- Visible focus, logical focus order, and no keyboard traps.
- Labels are associated with inputs; errors are announced.
- Contrast meets WCAG AA; color is never the only signal.
- Respect `prefers-reduced-motion` and browser text scaling.

## States

Implement empty, loading, error, success, disabled, and long-content states. A screen is not done when only the happy path renders.

## Rendering

When the project draws pixels directly:

- Own GPU resources; release them on the render thread.
- Batch draw calls; avoid per-frame allocation.
- Keep shaders small and versioned with a manifest.
- Validate shader compilation and log the exact source line on failure.
- Handle resize, minimize, focus loss, and device loss.
- Separate simulation from rendering; interpolate visual state.
- Profile CPU submission and GPU time before optimizing.

## Performance

- Measure layout, paint, and interaction latency.
- Avoid layout shift and unbounded lists.
- Lazy-load below-the-fold work.
- Cache immutable assets; invalidate with a version.
- Test on a low-end profile, not only the developer machine.

## Testing

- Unit-test pure formatting and state transitions.
- Integration-test the primary flow and its error path.
- Add a visual regression or a screenshot for layout-critical surfaces.
- Run accessibility checks in CI when possible.

## Definition of done

- The flow works with keyboard and pointer.
- All required states render.
- No console errors or unhandled promise rejections.
- The change meets the measured budget or the gap is documented.

## Handoff

Report screenshots or a recording, accessibility notes, commands and results, and the next concrete step.

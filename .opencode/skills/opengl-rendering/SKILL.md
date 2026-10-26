---
name: OpenGL Rendering
description: Build an OpenGL 4.6 core renderer with SDL3, glad, shader compilation, sprite batching, cameras, textures, framebuffers, and debug tooling. Use for anything that draws pixels or debugs the GPU.
metadata:
  origin: DAMM
---

# OpenGL Rendering

## Context

- SDL3 creates the window and the GL context; the renderer owns GL objects.
- Load functions with glad after the context is current.
- Request a 4.6 core profile, forward-compatible, with a depth buffer. Fall back to 3.3 core only if necessary.
- Enable the debug callback in debug builds.

## First pipeline (2D)

1. One shader pair: `sprite.vert` / `sprite.frag`.
2. One VAO with a quad: position, UV, color.
3. One dynamic VBO for per-frame vertices; orphaning or triple buffering.
4. One texture atlas.
5. Orthographic camera with a stable pixel-to-world mapping.
6. Batch by texture and state; draw with `glDrawElements`/`glDrawArrays`.

Vertex layout:

```cpp
struct SpriteVertex {
  glm::vec2 position;
  glm::vec2 uv;
  glm::vec4 color;
};
```

Batch rules:

- Sort by layer, then texture, then blend mode.
- Flush when the texture changes or the buffer is full.
- No per-frame heap allocations in the draw path.
- Use a unit quad and per-instance transforms when that is simpler.

## Shader rules

- Compile and link with explicit logs; fail loudly.
- Log the shader name and source path on error.
- Cache uniform locations, not strings.
- Prefer explicit `layout(location = ...)` bindings.
- Validate uniforms that must exist.
- Hot reload in debug builds: watch file mtime, rebuild, swap on success, keep the old program on failure.

## Camera

```cpp
struct Camera2D {
  glm::vec2 position;
  float zoom = 1.0f;
  float viewportWidth;
  float viewportHeight;
  glm::mat4 viewProjection() const;
};
```

- Keep world units separate from pixels.
- Handle window resize by updating the projection, not the world.
- Round or snap only at the final screen-space step.

## Textures

- Decode with stb_image; upload with `glTexImage2D`.
- Use `GL_NEAREST` for pixel art, `GL_LINEAR` for smooth art.
- Generate mipmaps only when the art needs them.
- Respect `GL_UNPACK_ALIGNMENT`.
- Release GL objects on the render thread.
- Handle missing textures with a visible magenta/checker fallback.

## Framebuffers and post-processing

- Check `glCheckFramebufferStatus`.
- Render to an offscreen target only when needed.
- Recreate size-dependent targets on resize.
- Use sRGB framebuffers and correct gamma.
- Keep post-process passes small and explicit.

## Debugging

- `glGetError` in debug, with a file/line macro.
- `GL_DEBUG_OUTPUT` callback with severity.
- RenderDoc capture for visual bugs.
- Wireframe toggle and bounding-box debug draw.
- Log GPU/vendor/version at startup.

## Performance

- Measure draw calls and CPU/GPU frame time before optimizing.
- Prefer one atlas and one batch.
- Avoid redundant state changes.
- Do not read back the framebuffer in the frame loop.
- Keep resolution scaling as an option before complex optimizations.

## Testing

- Unit-test camera math, batching, and command generation.
- Add a hidden-window smoke test: create context, compile shaders, draw one triangle, read one pixel, shut down.
- Record the driver/GPU for manual checks.
- Never claim a visual fix without a screenshot or a described manual check.

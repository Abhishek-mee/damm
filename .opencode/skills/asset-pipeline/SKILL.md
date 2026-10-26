---
name: Asset Pipeline
description: Turn source textures, audio, levels, and data into deterministic cooked assets with manifests, validation, hot reload, and license tracking. Use for atlas packers, level compilers, asset registries, and build tooling.
metadata:
  origin: DAMM
---

# Asset Pipeline

## Source vs cooked

```text
assets/            source files, edited by humans
  textures/
  audio/
  data/
build/assets/      cooked output, never committed
```

- Source assets are versioned (or LFS for large binaries).
- Cooked output is reproducible from source + tool version.
- The runtime loads cooked assets through an asset registry, not raw paths.

## Manifest

Every cooked asset gets:

```json
{
  "id": "player.idle",
  "type": "texture",
  "source": "assets/textures/player.png",
  "hash": "sha256:...",
  "width": 64,
  "height": 64,
  "atlas": "characters",
  "license": "CC0-1.0",
  "author": "..."
}
```

The runtime validates the ID, type, hash, and dimensions. Missing assets are errors, not silent nulls.

## Atlas packing

- Stable sort by name, then size.
- No overlapping rectangles.
- Padding to avoid bleed.
- Power-of-two only if the GPU/API requires it.
- Emit atlas PNG + JSON + a preview.
- Deterministic output for the same inputs.

## Level/data compiler

- Parse source format with strict validation.
- Report file, line, and expected type on error.
- Emit a versioned binary or compact JSON.
- Reject unknown fields unless explicitly allowed.
- Keep a `--check` mode for CI (no writes).

## Hot reload

- Debug only.
- Watch source mtimes; debounce.
- Build to a temp file, then atomically replace.
- Keep the old asset if the rebuild fails.
- Log what reloaded and what did not.

## Naming

```text
<category>_<name>_<variant>.<ext>
player_idle_01.png
ui_click_02.wav
level_tutorial_01.json
```

- lowercase, underscores, no spaces
- stable IDs independent of file paths
- no version numbers in runtime IDs

## Licenses

- Every asset needs a source and license.
- Keep a credits file for shipped builds.
- Do not ship an asset with unknown provenance.
- Generated assets need the generator and prompt/settings recorded.

## Validation

A `--check` run must fail on:

- missing files
- duplicate IDs
- invalid dimensions/format
- missing license
- unknown enum values
- non-deterministic output

## Rules

- No network access during cook.
- No timestamps in cooked output unless required.
- No absolute paths in manifests.
- No secrets in asset metadata.
- Tools are versioned with the game; a cook with a different tool version is not comparable.

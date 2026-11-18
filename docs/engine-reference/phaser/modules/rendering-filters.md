# Phaser 4 — Rendering and Filters

*Last verified: 2026-11-14*

## Renderer architecture

Phaser 4 replaces the v3 pipeline system with **render nodes**. Each node does
one rendering task. Standard game objects work without changes; custom rendering
requires a render node registered through `RenderConfig#renderNodes`.

Implications for this project:

- Do not subclass or patch pipelines. The `Pipeline` system no longer exists.
- Do not call WebGL directly. Use `Extern` if raw GL is ever required.
- Standard graphics are enough for the MVP: `Graphics`, `Text`, `Container`,
  `Rectangle`, and generated textures.

## Filters

`preFX`, `postFX`, and the old mask system are replaced by **filters**.

- `gameObject.filters.internal` — affects only the object.
- `gameObject.filters.external` — affects the object within its rendering context.
- Filters can be applied to any game object or scene camera and can be stacked.
- `BitmapMask` is removed; use the `Mask` filter:
  `sprite.filters.internal.addMask(maskObject)`.
- `GeometryMask` remains Canvas-only; avoid it in a WebGL project.
- `ColorMatrix` methods moved to the `colorMatrix` property.

For a puzzle game, filters are optional polish. Use them for merge flashes,
line-clear bursts, or a subtle vignette — not for constant background effects
that hurt the "readable board" pillar.

## Lighting

- Enable with `setLighting(true)`; do not assign a `Light2D` pipeline.
- Lights have a `z` height property.
- Lighting changes the shader and breaks batching. Avoid dynamic lighting in the
  MVP; the 2048 palette and flat tiles do not need it.
- 4.2 adds cone lights (`setCone`, `setConeRotation`, `setConeAngles`) and
  stencil-based effects. These are beyond the MVP.

## Drawing the board

Recommended approach:

- Draw each tile as a cached texture or a `Graphics`/`Rectangle` with rounded
  corners, then reuse it. Do not create a new texture every frame.
- Use a single `Container` per board or a `SpriteGPULayer` if tile counts grow.
- Keep tile size and board dimensions in a central config so board-size presets
  (10×20, 8×16, 6×12) share the same renderer.
- Use `Phaser.Scale.FIT` with `autoCenter: CENTER_BOTH` for a 1600×900 logical
  canvas.
- Keep the background neutral; accent color only for an active cascade.

## Performance rules

- Target 60 fps / 16.6 ms; cap draw calls at 50.
- Batch tiles: one texture atlas or one generated texture per value.
- Avoid per-frame texture swaps and per-frame `Graphics.clear()` + full redraw
  when a dirty-flag update is enough.
- `roundPixels` defaults to `false`; do not force it globally. For crisp tile
  edges, use integer positions and `vertexRoundMode` where needed.
- `SpriteGPULayer` is the escape hatch for very large numbers of moving sprites;
  `TilemapGPULayer` is for enormous tilemaps, not a small puzzle board.
- Measure before optimizing; the browser dev tools are the source of truth.

## Gotchas

- Canvas is deprecated: do not rely on `Phaser.AUTO` silently choosing it. Verify
  the WebGL renderer is active.
- Custom shaders and compressed textures use GL orientation (Y=0 at the bottom).
- `DynamicTexture` and `RenderTexture` commands are buffered; call `render()`.
- `Mesh` and `Plane` are gone. Use `Mesh2D` only if textured triangles are truly
  needed.
- `Math.TAU` is now `PI * 2`.
- Direct `gl` calls can desynchronize Phaser's WebGL state; use `Extern`.
- Stencil is enabled by default in 4.2+; disable it with `render.stencil` if the
  game does not use stencil effects, to save memory.

## Sources

- Migration guide: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md>
- Rendering concepts: <https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Rendering%20Concepts/Phaser%204%20Rendering%20Concepts.md>
- 4.2.0 changelog: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.2/CHANGELOG-v4.2.0.md>

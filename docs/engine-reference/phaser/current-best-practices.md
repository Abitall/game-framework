# Phaser 4 — Current Best Practices

*Last verified: 2026-11-14*

## Rendering

- Use the **WebGL renderer**. The Canvas renderer is deprecated and cannot run
  Phaser 4's advanced rendering features.
- Use standard game objects (Sprite, Image, Text, Graphics, Tilemap) unless you
  have a measured reason to go deeper. The render-node rewrite is transparent for
  standard objects.
- Do not write custom WebGL pipelines. If custom rendering is required, write a
  render node and register it through `RenderConfig#renderNodes`.
- Do not make direct `gl` calls; use the `Extern` game object, which resets the
  WebGL state after it finishes.
- Prefer `SpriteGPULayer` for thousands of moving sprites (single draw call) and
  `TilemapGPULayer` for very large tilemaps.
- Use the PCT atlas format when building texture atlases; it is dramatically
  smaller than JSON atlases.

## Filters, lighting, and effects

- FX and masks are now **filters**. Use `filters.internal` for an object-only
  effect and `filters.external` for an effect that sees the surrounding scene.
- Filters can be stacked and applied to any game object or camera.
- Use `Mask` for masking; `BitmapMask` is gone and `GeometryMask` is Canvas-only.
- Use `setLighting(true)` for lighting, not `setPipeline('Light2D')`. Lighting
  changes the shader and breaks batches, so use it sparingly in a 2D puzzle.
- For bloom/shine effects, use `Phaser.Actions.AddEffectBloom()` and
  `Phaser.Actions.AddEffectShine()`.

## Coordinates, math, and data

- Use `Vector2` everywhere; `Geom.Point` was removed.
- Use native `Set` and `Map`; `Phaser.Struct.Set/Map` were removed.
- Remember `Math.TAU === PI * 2`; use `Math.PI_OVER_2` if you need half-pi.
- Texture coordinates are GL-style (Y=0 at the bottom) in custom shaders and
  compressed textures.
- `roundPixels` defaults to `false`; use `vertexRoundMode` for per-object control
  instead of globally forcing rounding.

## Textures and dynamic rendering

- `DynamicTexture` and `RenderTexture` buffer commands: call `render()`.
- Use `preserve()` when the command buffer must survive a render, and
  `RenderTexture.renderMode = "redraw"` when updating mid-frame.
- Use `Shader#setUniform()` for individual uniforms and `Shader#renderImmediate()`
  outside the normal render loop.
- Load GLSL separately; fragment/vertex classification no longer happens at load
  time.

## Input, scale, and timing

- Keyboard, pointer, and touch input are unchanged from the standard Phaser API.
- Use `Phaser.Scale.FIT` with `autoCenter` for a responsive web canvas.
- `Timestep#setFPSLimit()` changes the FPS cap at runtime; prefer it over editing
  timestep internals.
- Test touch gestures on a real phone; prevent page scrolling during drags.

## TypeScript and project conventions

- `erasableSyntaxOnly` is on: no `enum`, no constructor parameter properties.
  Use `as const` objects and union types.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports.
- `noUncheckedIndexedAccess` is on: guard array/map access.
- Keep game rules in pure `src/systems/` modules so Vitest can test them without
  a browser or a Phaser scene.
- Scene classes should render state and forward input, not own the rules.
- Use `private` fields with camelCase names; no underscore prefix.

## Testing and verification

- Vitest for deterministic logic: merge resolution, gravity, line detection,
  scoring, spawn/game-over.
- Playwright for browser smoke: canvas boots, keyboard/touch input works, game
  over and restart work.
- For visual changes, compare screenshots in both light and dark themes.
- Profile with the browser dev tools; keep the frame budget at 16.6 ms and draw
  calls at or below 50.

## Sources

- Phaser 4 migration guide: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md>
- Phaser 3 vs Phaser 4: <https://phaser.io/news/2026/05/phaser-3-vs-phaser-4>
- Phaser 4.2.0 / 4.2.1 changelogs (official repository).

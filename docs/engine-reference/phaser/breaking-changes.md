# Phaser 4 — Breaking Changes

*Last verified: 2026-11-14*

This document covers changes that break or silently alter Phaser 3 behavior.
It is based on the official v3→v4 migration guide and the 4.2.x changelogs.

## Version history relevant to this project

| Version | Date | Impact |
|---|---|---|
| 4.0.0 | April 2026 | Major rewrite: renderer, filters, tint, camera, geometry, data structures |
| 4.1.x | 2026 | Incremental; see official changelog |
| 4.2.0 | 2026-06-19 | Stencil, Mesh2D, cone lights, tint modes, alpha strategies; stencil defaults changed |
| 4.2.1 | 2026-07-09 | Fixes: stencil invert, framebuffer stencil clear, ESM namespace access, ScaleManager parent resize, tween startDelay |

## 4.0.0 — renderer and visual systems

- **Pipelines replaced by render nodes.** The v3 `Pipeline` system is gone. Custom
  WebGL pipelines must be rewritten as render nodes and registered through
  `RenderConfig#renderNodes`.
- **Canvas renderer deprecated.** Canvas is still present but does not support
  the WebGL features used by Phaser 4. Use the WebGL renderer for new projects.
- **FX and masks unified into filters.** `preFX`/`postFX` are gone. Filters are
  split into `filters.internal` (object only) and `filters.external` (object in
  its rendering context). Filters work on any game object and on scene cameras.
- **`BitmapMask` removed.** Use the `Mask` filter:
  `sprite.filters.internal.addMask(maskObject)`.
- **`GeometryMask` remains Canvas-only.** Do not rely on it for WebGL.
- **Removed FX and replacements:**
  - `Bloom` → `Phaser.Actions.AddEffectBloom()`
  - `Shine` → `Phaser.Actions.AddEffectShine()`
  - `Circle` → `Phaser.Actions.AddMaskShape()`
  - `Gradient` → the `Gradient` game object
- **`ColorMatrix` API moved:** methods now live on the `colorMatrix` property
  (`colorMatrix.colorMatrix.sepia()`).
- **Tint system changed:** `tintFill` and `setTintFill()` were removed. Use
  `setTint(color).setTintMode(Phaser.TintModes.FILL)`. `Phaser.TintModes`
  includes `MULTIPLY`, `FILL`, `ADD`, `SCREEN`, `OVERLAY`, `HARD_LIGHT`
  (and `MULTIPLY_TWO` in 4.2.0).
- **Camera matrices rewritten:** `Camera#matrix` now contains rotation + zoom +
  scroll, not position. `Camera#matrixExternal` contains position, and
  `Camera#matrixCombined` combines both. Code that manipulated camera matrices
  directly must be updated.
- **Texture orientation is GL-style:** Y=0 is at the bottom. Standard PNG/JPG
  textures are handled automatically; compressed textures must be re-compressed
  with flipped Y, and custom shaders must use the new convention.
- **`DynamicTexture` / `RenderTexture` buffering:** drawing commands are buffered
  and require an explicit `render()` call. `preserve()` keeps the command buffer,
  and `RenderTexture.renderMode` supports `"render"`, `"redraw"`, and `"all"`.
- **Shader API rewritten:** the constructor takes a `ShaderQuadConfig` object.
  Shadertoy-style uniforms are no longer set automatically. Use
  `Shader#setUniform()` and `Shader#renderImmediate()`.
- **GLSL loading changed:** shaders are no longer classified as fragment/vertex
  at load time; load them separately and combine them. Custom templates were
  replaced by `#pragma` directives.
- **Lighting simplified:** `sprite.setPipeline('Light2D')` becomes
  `sprite.setLighting(true)`. Lights have a `z` height property. Lighting changes
  the shader and breaks render batches.
- **TileSprite rewritten:** texture cropping is no longer supported; texture
  frames, `tileRotation`, and non-power-of-two textures are supported.
- **Graphics/Shape changes:** `Grid` uses `stroke` instead of `outline`;
  `Rectangle` supports rounded corners; `Graphics` adds `pathDetailThreshold`.
- **`Geom.Point` removed:** use `Vector2` (e.g., `Point.Ceil` →
  `Vector2.ceil`, `Point.Clone` → `Vector2.clone`). Geometry classes now return
  `Vector2`.
- **Math constants:** `Math.TAU` is now `PI * 2` (it was incorrectly `PI / 2` in
  v3). `Math.PI2` was removed; use `Math.TAU`. The old half-pi value is now
  `Math.PI_OVER_2`.
- **Data structures:** `Phaser.Struct.Set` and `Phaser.Struct.Map` were replaced
  by native `Set` and `Map`.
- **`roundPixels` defaults to `false`** (was `true` in v3). Per-object control is
  available through `GameObject#vertexRoundMode` (`"off"`, `"safe"`,
  `"safeAuto"`, `"full"`, `"fullAuto"`).
- **Removed game objects:** `Mesh` and `Plane`. 3D support is planned separately.
- **Removed plugins/entry points:** `Camera3D`, `Layer3D`, Facebook detection,
  `phaser-ie9.js`.
- **Removed utilities/polyfills:** `Create.GenerateTexture`, all Create palettes,
  `TextureManager.generate`, `Math.SinCosTableGenerator`, and legacy polyfills.
- **Spine:** Phaser-bundled Spine 3/4 plugins are no longer updated; use the
  official Esoteric Software plugin.
- **Miscellaneous:** `Shader#setTextures()` replaces the texture array;
  `DOMElement` requires a container; direct WebGL `gl` calls should go through
  `Extern`; `WebGLRenderer#textureIndexes` is replaced by
  `glTextureUnits.unitIndices`; `BatchHandlerConfig#createOwnVertexBuffer` was
  removed.

## 4.2.0 — stencil, Mesh2D, lights

- Stencil support is on by default; `render.stencil` can disable the stencil
  buffer to save memory.
- `Stencil`, `StencilReference`, and `CustomContext` game objects were added.
- `Mesh2D` renders textured triangles and batches with sprites.
- Cone lights were added (`setCone`, `setConeRotation`, `setConeAngles`).
- `TintModes.MULTIPLY_TWO` and per-corner second tint were added.
- `Filters` now adds its RenderStep just before the core render method.
- `SpriteGPULayer` no longer has a Mask component (WebGL-only object).
- `Timestep#setFPSLimit` changes the FPS limit at runtime.

## 4.2.1 — fixes

- `stencilInvert` works correctly.
- Framebuffers clear stencil correctly on use.
- Removed inline Phaser namespace access that broke the ESM build in
  `CombineColorMatrix`, `ImageLight`, and `Texture`.
- Fixed `ScaleManager` not resizing to the parent container (#7213).
- Fixed tweens with `startDelay` staying in `START_DELAY` state (#7093).

## Migration checklist for this project

- [ ] Use the WebGL renderer; do not target Canvas.
- [ ] Do not use `Geom.Point`, `Struct.Set`, or `Struct.Map`.
- [ ] Do not use `setTintFill()`; use `setTint()` + `setTintMode()`.
- [ ] Do not use `preFX`/`postFX`; use filters.
- [ ] Do not use `BitmapMask`; use the `Mask` filter.
- [ ] Use `Vector2`, native `Set`/`Map`, and `Math.TAU` with its corrected value.
- [ ] Call `render()` on `DynamicTexture`/`RenderTexture` after buffered draws.
- [ ] Do not use `Mesh` or `Plane`.
- [ ] Verify custom shaders against GL Y-up coordinates.
- [ ] Check `roundPixels` behavior; the default changed to `false`.
- [ ] Use the official Spine plugin if Spine is ever needed.

# Phaser 4 — Deprecated and Removed APIs

*Last verified: 2026-11-14*

Use the right-hand column. The left-hand column is Phaser 3 code that agents
trained on older data will still suggest.

## Rendering and visuals

| Don't use (Phaser 3) | Use instead (Phaser 4) |
|---|---|
| Canvas renderer | WebGL renderer; Canvas is deprecated |
| Custom `Pipeline` classes | Custom render nodes via `RenderConfig#renderNodes` |
| `preFX` / `postFX` | `filters.internal` / `filters.external` |
| `Phaser.Display.Masks.BitmapMask` | `Phaser.Filters.Mask` via `filters.internal.addMask()` |
| `GeometryMask` in WebGL | `Mask` filter (GeometryMask is Canvas-only) |
| `Bloom` FX | `Phaser.Actions.AddEffectBloom()` |
| `Shine` FX | `Phaser.Actions.AddEffectShine()` |
| `Circle` FX | `Phaser.Actions.AddMaskShape()` |
| `Gradient` FX | `Gradient` game object |
| `sprite.setTintFill(color)` | `sprite.setTint(color).setTintMode(Phaser.TintModes.FILL)` |
| `colorMatrix.sepia()` | `colorMatrix.colorMatrix.sepia()` |
| `sprite.setPipeline('Light2D')` | `sprite.setLighting(true)` |
| `Mesh` / `Plane` game objects | No replacement; use sprites or `Mesh2D` for textured triangles |
| Direct WebGL `gl` calls | `Extern` game object (resets WebGL state) |
| `WebGLRenderer.textureIndexes` | `glTextureUnits.unitIndices` |
| `BatchHandlerConfig#createOwnVertexBuffer` | Removed; batch handlers create their own buffers |

## Math, geometry, and data structures

| Don't use (Phaser 3) | Use instead (Phaser 4) |
|---|---|
| `Phaser.Geom.Point` | `Phaser.Math.Vector2` |
| `Phaser.Geom.Point.Ceil` | `Vector2.ceil` |
| `Phaser.Geom.Point.Floor` | `Vector2.floor` |
| `Phaser.Geom.Point.Clone` | `Vector2.clone` |
| `Phaser.Geom.Point.CopyFrom(src, dest)` | `dest.copy(src)` |
| `Phaser.Geom.Point.GetMagnitude` | `Vector2.length` |
| `Phaser.Geom.Point.GetMagnitudeSq` | `Vector2.lengthSq` |
| `Phaser.Geom.Point.Interpolate` | `Phaser.Math.LinearXY` |
| `Phaser.Geom.Point.GetRectangleFromPoints` | `Phaser.Math.GetVec2Bounds` |
| `Phaser.Struct.Set` | native `Set` |
| `Phaser.Struct.Map` | native `Map` |
| `Math.TAU` as `PI / 2` | `Math.TAU` is now `PI * 2`; use `Math.PI_OVER_2` for half-pi |
| `Math.PI2` | `Math.TAU` |
| `Math.SinCosTableGenerator` | Removed |

## Textures, shaders, and cameras

| Don't use (Phaser 3) | Use instead (Phaser 4) |
|---|---|
| Fire-and-forget `DynamicTexture` draws | Call `DynamicTexture#render()` after buffered commands |
| Fire-and-forget `RenderTexture` draws | Call `RenderTexture#render()` or set `renderMode` |
| `new Shader(scene, key, frag, vert)` style | `new Shader(scene, config: ShaderQuadConfig)` |
| Automatic Shadertoy uniforms | Set uniforms explicitly with `Shader#setUniform()` |
| GLSL loaded as fragment/vertex | Load shaders separately and combine them; use `#pragma` directives |
| `Camera#matrix` includes position | `Camera#matrix` is rotation + zoom + scroll; use `matrixExternal` / `matrixCombined` |
| Top-left texture coordinates | GL orientation: Y=0 at the bottom |
| `TileSprite` cropping | Texture frames; cropping was removed |
| `Grid` `outline*` properties | `stroke*` properties |
| `Create.GenerateTexture` / `TextureManager.generate` | Removed; draw with `Graphics` or a `DynamicTexture` |

## Plugins and entry points

| Don't use | Use instead |
|---|---|
| `Camera3D` plugin | Removed |
| `Layer3D` plugin | Removed |
| Facebook detection constants | Removed |
| `phaser-ie9.js` entry point | Modern browser build |
| Bundled Spine 3/4 plugin | Official Esoteric Software Spine plugin |

## Behavior changes that are easy to miss

| Change | Correct expectation in Phaser 4 |
|---|---|
| `roundPixels` default | `false` (was `true`); use `vertexRoundMode` for per-object control |
| `Shader#setTextures()` | Replaces the array; call once with the full array |
| `DOMElement` without a parent | Throws an error; always provide a container |
| `Gamepad.Button` state | Accepts `isPressed` to initialize state across scene transitions |
| Stencil defaults (4.2+) | Stencil test enabled by default; disable with `render.stencil` to save memory |
| `SpriteGPULayer` mask | No Mask component; the object is WebGL-only |
| Tween `startDelay` (4.2.1) | State now transitions correctly from `START_DELAY` to `ACTIVE` |

## Project-specific forbidden APIs

- No `Phaser.Geom.Point`, `Phaser.Struct.Set`, or `Phaser.Struct.Map`.
- No `enum` in TypeScript (`erasableSyntaxOnly`); use `as const` objects and
  string-literal unions.
- No physics-driven merge or line resolution; keep the board deterministic.
- No external art assets in the MVP; use code-drawn graphics.

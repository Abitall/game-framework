---
paths:
  - "src/**"
---

# Phaser 4 Code Rules

- Use Phaser 4 APIs only. Check `docs/engine-reference/phaser/breaking-changes.md` before using anything that existed in Phaser 3.
- Scenes are thin: they wire input, rendering, and lifecycle. Game rules live in systems.
- Systems must stay engine-agnostic: no `import Phaser` inside `src/systems/**`. Systems take plain data and return plain results (see ADR-0001).
- Never hardcode gameplay values. Numbers come from `src/config/config.ts` or an injected config object.
- Use typed constants or enums for scene keys, event names, registry keys, animation keys, and texture keys. No string literals scattered across files.
- Inject the random source. Never call `Math.random()` in gameplay code — use the project RNG so runs stay reproducible.
- Tuning values live in one object per mechanic (`src/config/tuning.ts`) with declared ranges. The mechanic reads that object every frame, never copies it at construction, so a dev slider changes the game immediately. See the `tuning-panel` skill.
- Pool frequent objects (particles, projectiles, transient text). Avoid per-frame allocations in `update()`.
- Remove event listeners, timers, and tweens on scene shutdown. A scene restart must not double-bind handlers.
- All player-facing text goes through the i18n layer. No hardcoded user-facing strings.
- Gate debug affordances behind the developer-mode flag so release builds do not expose them.
- Run `npx tsc --noEmit` after non-trivial edits when TypeScript is configured.

## Examples

**Correct** — pure system, injected dependencies:

```ts
export interface BoardState { readonly cells: readonly (number | null)[] }

export function applyGravity(state: BoardState, width: number, height: number): BoardState {
  // no Phaser import, no Math.random, no globals
}
```

**Incorrect** — engine leak and hidden global state:

```ts
import Phaser from "phaser"

export function applyGravity(scene: Phaser.Scene): void {
  const speed = 300 // hardcoded tuning value
  scene.registry.set("gravity", speed * Math.random())
}
```

---
name: tuning-panel
description: "Build a dev-only Phaser tuning panel: sliders bound to a tuning object, values read every frame, dump to JSON on a key press. The user tunes by playing instead of describing."
argument-hint: "[mechanic id, e.g. M01-drift]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

Let the user tune by playing. "Move it left a bit, restart, try again" costs ten
exchanges; a slider costs one drag.

## Phase 1: Extract the numbers

Find every constant the mechanic uses. Each becomes a field of one tuning object:

```ts
// src/config/tuning.ts
export interface DriftTuning {
  gripRear: number
  gripFront: number
  boostMultiplier: number
  lateralDamping: number
}

export const DRIFT_TUNING: DriftTuning = {
  gripRear: 0.8,
  gripFront: 0.9,
  boostMultiplier: 3.4,
  lateralDamping: 0.92,
}
```

Ranges live next to the values, not in the panel:

```ts
export const DRIFT_RANGES: Record<keyof DriftTuning, [number, number, number]> = {
  gripRear: [0, 2, 0.01],
  gripFront: [0, 2, 0.01],
  boostMultiplier: [1, 6, 0.1],
  lateralDamping: [0.5, 1, 0.01],
}
```

## Phase 2: Read every frame, never copy

The single most common bug: the mechanic copies the value at start, so moving the
slider changes nothing.

```ts
// correct — reads the live object
update(_time: number, delta: number): void {
  const grip = this.tuning.gripRear
  ...
}

// wrong — frozen at construction
constructor(tuning: DriftTuning) {
  this.grip = tuning.gripRear
}
```

## Phase 3: The panel

Dev-only, an HTML overlay so it never interferes with the Phaser canvas:

```ts
// src/dev/TuningPanel.ts
import { DEVELOPER_TOOLS } from "../config/config"

export function mountTuningPanel<T extends Record<string, number>>(
  id: string,
  target: T,
  ranges: Record<keyof T, [number, number, number]>,
): () => void {
  if (!DEVELOPER_TOOLS) return () => {}

  const root = document.createElement("div")
  root.id = `tuning-${id}`
  root.style.cssText =
    "position:fixed;right:8px;top:8px;z-index:9999;background:#111c;color:#eee;" +
    "font:12px/1.4 monospace;padding:8px;border-radius:6px;display:none;max-height:80vh;overflow:auto"

  for (const key of Object.keys(ranges) as (keyof T)[]) {
    const [min, max, step] = ranges[key]
    const row = document.createElement("label")
    row.style.cssText = "display:flex;gap:6px;align-items:center"
    const name = document.createElement("span")
    name.textContent = String(key)
    name.style.cssText = "width:130px"
    const input = document.createElement("input")
    input.type = "range"
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.value = String(target[key])
    const value = document.createElement("span")
    value.textContent = input.value
    input.addEventListener("input", () => {
      target[key] = Number(input.value) as T[keyof T]
      value.textContent = input.value
    })
    row.append(name, input, value)
    root.append(row)
  }

  document.body.append(root)

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return
    event.preventDefault()
    root.style.display = root.style.display === "none" ? "block" : "none"
  }
  const onDump = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "p") return
    const dump = JSON.stringify(target, null, 2)
    console.log(dump)
    void navigator.clipboard?.writeText(dump)
  }

  window.addEventListener("keydown", onKey)
  window.addEventListener("keydown", onDump)
  return () => {
    window.removeEventListener("keydown", onKey)
    window.removeEventListener("keydown", onDump)
    root.remove()
  }
}
```

Wire it in the scene's `create()`, only in developer mode:

```ts
if (DEVELOPER_TOOLS) {
  this.tuningPanelCleanup = mountTuningPanel("M01", DRIFT_TUNING, DRIFT_RANGES)
}
```

Remove in `shutdown`:

```ts
this.events.once("shutdown", () => this.tuningPanelCleanup?.())
```

## Phase 4: Carry the values back

The panel never writes to the config file. The user tunes, presses `P`, and you:

1. take the printed JSON;
2. write it into `src/config/tuning.ts`;
3. commit with a reference to the playtest entry.

This keeps the change visible in git next to the playtest that justified it.

## Checklist

- [ ] every constant is a field of one object
- [ ] ranges are declared next to the values
- [ ] the mechanic reads the object every frame
- [ ] the panel is absent when `DEVELOPER_TOOLS` is false
- [ ] the cleanup function is called on scene shutdown
- [ ] `Tab` toggles, `P` dumps
- [ ] the dump never writes files itself

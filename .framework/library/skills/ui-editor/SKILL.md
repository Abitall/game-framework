---
name: ui-editor
description: "Dev-only in-game UI editor for Phaser: click to select, drag to move, nudge with arrows, export the layout as JSON. Replaces asking the agent to move things by 8 pixels."
argument-hint: "[scene name, e.g. MenuScene]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

Let the user move things themselves. "Shift the title left a bit, rebuild, look,
shift it back" costs ten exchanges; a drag costs one.

## What you get

`references/UiEditor.ts` — a dependency-free overlay that:

- lists every top-level display object in the running scene;
- selects by click, drags with the mouse, nudges with arrow keys (Shift = 10 px);
- edits x, y, scaleX, scaleY, alpha, depth in a numeric panel;
- persists edits in `localStorage` per scene, so a reload keeps them;
- exports the whole layout as JSON, or copies it to the clipboard;
- hides with `F2`.

`references/UiEditor.test.ts` — tests for keying and the snapshot/apply round-trip.

## Integration

1. Copy `references/UiEditor.ts` to `src/dev/UiEditor.ts`.
2. In the scene you want to edit, mount it **only in dev**:

```ts
if (import.meta.env.DEV) {
  let cleanup: (() => void) | undefined;
  void import("../dev/UiEditor").then(({ mountUiEditor }) => {
    cleanup = mountUiEditor(this);
  });
  this.events.once("shutdown", () => cleanup?.());
}
```

Use `import.meta.env.DEV`, not a runtime flag. Vite then removes the branch and
the whole chunk from a production build. A runtime constant leaves a dead 6 KB
chunk in the bundle — check the build output to confirm the chunk is gone.

3. Copy `references/UiEditor.test.ts` to `tests/ui-editor.test.ts` if the project
   uses vitest.

## Using it

| Action | Result |
|---|---|
| click on the canvas | selects the topmost object under the pointer |
| drag | moves the selected object in world coordinates (camera zoom is handled) |
| arrows / Shift+arrows | nudge by 1 / 10 px |
| panel fields | exact values, applied live |
| Export JSON | downloads `<Scene>.ui.json` |
| Copy | same JSON to the clipboard |
| Reset | clears the stored layout for this scene |
| F2 | hides or shows the panel |

## Carrying values into code

The editor never edits source. The loop is:

1. The user drags until it looks right.
2. Export JSON.
3. Read the numbers and write them into the layout constants or config.
4. Commit with a note about what changed and why.

Do not ship the JSON as a runtime dependency unless the project already loads
layout data. A JSON file that nobody reads is worse than constants.

## Limits worth knowing

- Only **top-level** objects are editable. Children of a container are skipped,
  because their coordinates are relative to the parent.
- Objects without `x`/`y` (graphics, cameras) are ignored.
- Keys are the object `name`, or `type` with a `#n` suffix for duplicates. Set
  names on important objects so keys stay stable when the scene changes.
- It edits the live scene, not the source. Nothing persists except through the
  export step.

## Checklist

- [ ] `src/dev/UiEditor.ts` exists
- [ ] mounted behind `import.meta.env.DEV` with a shutdown cleanup
- [ ] production build contains no `UiEditor` chunk
- [ ] `npx tsc --noEmit` clean
- [ ] the panel appears in the dev server and lists the scene objects

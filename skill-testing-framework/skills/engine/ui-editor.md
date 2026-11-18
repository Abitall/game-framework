# Skill Test Spec: /ui-editor

## Skill Summary

`/ui-editor` adds a dev-only overlay to a Phaser scene: click to select a
top-level display object, drag to move, nudge with arrows, edit numeric
properties, and export the layout as JSON. The source is never modified; the
user carries the numbers back into code.

## Static Assertions (Structural)

- [ ] Ships `references/UiEditor.ts` and `references/UiEditor.test.ts`
- [ ] Requires mounting behind `import.meta.env.DEV`, not a runtime flag
- [ ] Documents that only top-level objects are editable
- [ ] States that the export is not a runtime dependency by default
- [ ] Requires a shutdown cleanup
- [ ] Requires confirming the production build has no `UiEditor` chunk

## Test Cases

### Case 1: Happy path
**Input:** a Phaser scene with a menu.
**Expected:** panel lists objects, click selects, drag moves, export produces JSON, values are carried into constants.

### Case 2: Runtime flag instead of `import.meta.env.DEV`
**Input:** `if (DEVELOPER_TOOLS) void import("../dev/UiEditor")`.
**Expected:** flagged; the chunk stays in the production build.

### Case 3: Editing a child of a container
**Expected:** the child is not selectable; the skill explains why and suggests naming the container instead.

### Case 4: User wants the JSON loaded at runtime
**Expected:** asks whether the project already loads layout data; warns against a file nobody reads.

## Verdict Criteria

- **PASS**: all assertions hold and every case matches.
- **NEEDS WORK**: one deviation.
- **FAIL**: the editor ships in a production build, or edits source files directly.

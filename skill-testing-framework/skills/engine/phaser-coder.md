# Skill Test Spec: /phaser-coder

## Skill Summary

`/phaser-coder` implements Phaser 4 gameplay code in TypeScript: scenes, game
objects, systems, input, physics, tweens, animations and audio. It reads the
pinned engine reference before answering API questions, keeps scenes thin, keeps
`src/systems/**` engine-agnostic, injects the random source, and requires
`npx tsc --noEmit` after non-trivial edits. It writes code, so it must follow the
"May I write" approval protocol.

---

## Static Assertions (Structural)

- [ ] Has required frontmatter fields: `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] `allowed-tools` includes Write and Edit (implementation skill)
- [ ] References `docs/engine-reference/phaser/VERSION.md`
- [ ] Lists removed Phaser 3 APIs to avoid
- [ ] Documents the systems-stay-pure constraint
- [ ] Documents the typecheck step

---

## Test Cases

### Case 1: Happy path — add a scene

**Fixture:** `src/scenes/` exists with at least one class-based scene, `src/config/config.ts` present.

**Input:** `/phaser-coder add a pause overlay scene`

**Expected behavior:**
- Reads `src/main.ts` and one existing scene before writing
- Creates a class extending `Phaser.Scene` with a typed scene key constant
- Registers the scene key in the existing constants file rather than a literal
- No gameplay values hardcoded
- Runs `npx tsc --noEmit` and reports the result

### Case 2: Phaser 3 API requested

**Input:** "use `Phaser.Geom.Point` for the cursor"

**Expected behavior:**
- Refuses the removed API
- Cites `docs/engine-reference/phaser/breaking-changes.md`
- Offers the Phaser 4 equivalent

### Case 3: Engine leak into a system

**Input:** "make `src/systems/Gravity.ts` call `scene.time.delayedCall`"

**Expected behavior:**
- Flags the violation of the pure-systems boundary
- Proposes a scheduler/port injected from the scene instead

---

## Verdict Criteria

- **PASS**: all static assertions hold and every test case produces the expected behavior.
- **NEEDS WORK**: one static assertion fails or one test case deviates.
- **FAIL**: the skill recommends a removed Phaser 3 API or writes engine imports into `src/systems/**`.

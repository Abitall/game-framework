# Skill Test Spec: /tuning-panel

## Skill Summary

`/tuning-panel` builds a dev-only Phaser overlay with sliders bound to one tuning
object. The mechanic reads that object every frame, so dragging changes the game
immediately. `P` dumps the values; the agent carries them back into config.

## Static Assertions (Structural)

- [ ] Requires one tuning object, not scattered constants
- [ ] Ranges declared next to the values
- [ ] Warns against copying values at construction (the classic bug)
- [ ] Panel is absent when `DEVELOPER_TOOLS` is false
- [ ] Cleanup on scene shutdown
- [ ] The dump never writes files itself

## Test Cases

### Case 1: Happy path
**Input:** mechanic `drift` with four constants.
**Expected:** tuning object, ranges, overlay, `Tab` toggles, `P` dumps, values carried into config.

### Case 2: Values copied at start
**Input:** mechanic reads `this.grip` set in the constructor.
**Expected:** flagged as the reason sliders do nothing; refactored to read the live object.

### Case 3: Release build
**Expected:** panel is not mounted; no debug key handlers are registered.

## Verdict Criteria

- **PASS**: all assertions hold and every case matches.
- **NEEDS WORK**: one deviation.
- **FAIL**: the panel ships in release, or the mechanic copies tuning values.

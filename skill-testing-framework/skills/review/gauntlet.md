# Skill Test Spec: /gauntlet

## Skill Summary

`/gauntlet` refines one thing that carries the impression of the game by comparing
our result against a real reference bar, blind, with the verdict written before the
answer is revealed. One gap per round, 3–6 rounds, stop when the gap stops being
visible.

## Static Assertions (Structural)

- [ ] Requires a real bar; refuses to run without one
- [ ] Uses `tools/ab.mjs` and `tools/reveal.mjs`
- [ ] States that `key.json` is never opened before the verdict
- [ ] Requires exactly one `GAP:` line per round
- [ ] Defines a stop condition

## Test Cases

### Case 1: Happy path
**Input:** target `screens`, bar provided, our capture provided.
**Expected:** blind pair created, verdict written, reveal run, one gap fixed, next round uses a different lens.

### Case 2: No bar
**Input:** "compare our HUD with something good".
**Expected:** stops and asks for a concrete reference image or game.

### Case 3: Verdict with three gaps
**Expected:** refuses the reveal and asks for the single biggest gap.

## Verdict Criteria

- **PASS**: all assertions hold and every case matches.
- **NEEDS WORK**: one deviation.
- **FAIL**: reveals the key before the verdict, or runs without a bar.

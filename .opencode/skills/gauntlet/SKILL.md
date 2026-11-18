---
name: gauntlet
description: "Blind A/B refinement of what matters most: compare our result against a reference bar, write the verdict before the answer is revealed, fix one biggest gap per round."
argument-hint: "[target: screens|feel|first-minute|ui]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question
---

Refine one thing that carries the impression of the game. Not everything — the
cost is tokens and time, so this applies to two or three targets per project.

## When to run

- the user is not impressed but cannot say why;
- a critical part is clearly below the bar;
- the first 60 seconds do not sell the game.

Do not run it on a part that is already accepted, or on anything the user has not
seen at least once.

## Phase 1: Pick the target and the bar

Ask which target matters most if it is not given:

- `screens` — menu, HUD, game over
- `feel` — movement, hit feedback, camera
- `first-minute` — what a new player sees
- `ui` — layout, readability, scaling

The bar must be a real image or a real game, not a memory. If there is no bar, say
so and stop: a blind comparison against nothing is theatre.

## Phase 2: Rounds

3–6 rounds. One lens per round, in rotation. A lens is a single question, for
example: "which one reads faster at a glance", "which one has clearer hierarchy",
"which one feels more deliberate".

For each round:

1. Capture our current state to a file.
2. Create the blind pair:

```bash
node tools/ab.mjs --round .studio/gauntlet/<target>/rounds/<NN> \
  --ref <bar image> --cand <our capture>
```

3. Look at A and B. Write the verdict **before** running reveal:

```markdown
WINNER: A
GAP: the HUD number is 40% larger, so the score reads first
```

Exactly one `GAP:` line. One gap per round, not a list.

4. Reveal:

```bash
node tools/reveal.mjs .studio/gauntlet/<target>/rounds/<NN>
```

5. Fix only the gap. Commit it. Next round uses a different lens.

## Phase 3: Stop

Stop when:

- three consecutive rounds are `TIE` or `win`;
- the remaining gap is below what the user can see;
- the user says "good enough".

Report: rounds run, wins/ties/losses, the gaps fixed, and the one gap that remains.

## Rules

- Never open `ab/key.json` before the verdict. `reveal.mjs` enforces this.
- Never run a round without a bar.
- Never fix two things in one round: the next verdict becomes unreadable.
- A `loss` is information, not failure. Record it in `LEDGER.md` (reveal does it).

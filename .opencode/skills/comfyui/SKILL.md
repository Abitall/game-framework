---
name: comfyui
description: "Generate images on the local GPU through ComfyUI: write the prompt, look at the result, judge it against criteria, and iterate until it is right."
argument-hint: "[what to draw]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

Image generation runs on the user's own GPU. No cloud, no API key, no per-image
cost. The cost is GPU time and the tokens spent looking at results.

The model here is **Flux 2 Klein 4B** with the Qwen 3 4B text encoder and the
Flux 2 VAE. That is the only verified pipeline; do not invent others.

## Phase 1: Write the prompt

A prompt that works has five parts, in this order:

1. **Subject** — what it is, singular and concrete: "a red apple", not "fruit".
2. **Style** — "flat vector", "pixel art", "isometric game icon", "watercolour".
3. **Composition** — "centered", "side view", "close-up", "on a plain white background".
4. **Palette** — the actual colours: "red and green on white".
5. **Lighting/quality** — "soft studio light", "no shadows", "clean edges".

Negative prompt is usually empty for Flux. Use it only for a repeated defect
("blurry", "text", "watermark").

Write the prompt in English. The model was trained on English captions.

## Phase 2: Draft cheaply

First pass is a draft, not a final: 512–768 px, 8–12 steps.

```json
{ "prompt": "...", "width": 512, "height": 512, "steps": 8, "cfg": 4 }
```

A draft costs ~30 seconds on an RTX 3060. Judge the idea, not the detail.

## Phase 3: Look at it

The tool returns a file path. Read that file — you must actually look at the
image, not assume. This is the expensive step: roughly 1–1.5k tokens per look.

## Phase 4: Judge against criteria

Check in this order, and stop at the first failure:

1. **Subject** — is it the thing that was asked for?
2. **Silhouette** — readable at a glance, at small size?
3. **Style** — does it match the requested look?
4. **Palette** — the colours asked for?
5. **Artifacts** — extra limbs, melted edges, stray objects, garbled text?
6. **Usability** — does it fit where it will be used (icon, tile, background)?

Write the verdict in one line: what is right, what is wrong, what to change.

## Phase 5: Iterate, one change at a time

Change one thing per round. If you change the subject and the style together you
cannot tell which one helped.

- Wrong subject → rewrite part 1, keep the rest.
- Right subject, wrong style → parts 2 and 5.
- Good image, wrong colours → part 4 only.
- Artifacts → add them to the negative prompt, keep the positive unchanged.
- Almost right → keep the seed, raise steps to 20–30 and the size to 1024.

**Stop after 5 rounds.** If it is still wrong, report what you tried and ask the
user to choose a direction. Do not burn an hour of GPU time guessing.

## Phase 6: Deliver

- Final image: 1024×1024, 20–30 steps, `production/images/`.
- Save the prompt next to it as `<name>.prompt.txt`, including the seed. Without
  it the result cannot be reproduced.
- If the image is used in the game, copy it into `assets/` and reference it from
  the config, not from the prompt.

## Rules

- **English prompts.** Short and concrete beats long and poetic.
- **No text in images.** Flux renders letters badly; ask for a blank space and
  draw the text in the game.
- **One change per round.** Otherwise the next verdict is meaningless.
- **Look before you judge.** Never describe an image you did not read.
- **Respect the GPU.** Do not queue more than one generation at a time; ComfyUI
  serialises them anyway, and a queue of ten is ten minutes of waiting.
- **Ask before a long batch.** More than ~10 generations is a decision, not a
  detail.

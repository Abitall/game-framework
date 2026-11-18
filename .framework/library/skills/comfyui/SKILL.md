---
name: comfyui
description: "Create images: choose the medium (code, Aseprite, ComfyUI), pick the model, build and validate a workflow, then prompt, look, judge and iterate on the local GPU."
argument-hint: "[what to draw]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

Image generation runs on the user's own GPU through ComfyUI. No cloud, no API
key, no per-image cost. The cost is GPU time and the tokens spent looking at
results.

## Phase 1: Choose the medium, and say so

The agent has three ways to make an image. Pick one and tell the user why, in one
line, before doing anything.

| Medium | Use it for | Cost |
|---|---|---|
| **Code** (Phaser Graphics, canvas, CSS) | UI frames, bars, gradients, simple icons, particles, procedural patterns | free, instant, scales, no assets to ship |
| **Aseprite** | pixel art: sprites, tiles, icons in a pixel style, spritesheets | cheap, precise, editable by hand |
| **ComfyUI** | illustration, textures, backgrounds, key art, anything painterly or photoreal | GPU time, tokens per look |

Rules of thumb:

- If it can be drawn with rectangles and circles, draw it in code. Shipping a PNG
  for a health bar is a mistake.
- If the game's art style is pixel art, use Aseprite: generated raster art will
  not match a 16×16 palette.
- If the user wants a picture — key art, a background, a textured panel — use
  ComfyUI.

When the request is ambiguous, ask once: "иконка в стиле пиксель-арт или
иллюстрация?" The answer decides the medium.

## Phase 2: Choose the model

```json
{ "tool": "models" }
```

Compare what the task needs with what is installed:

- **Flux 2 Klein 4B** — the verified default. Stylized illustration, textures,
  backgrounds. Works at 1024×1024 in ~30–40 s on an RTX 3060.
- Other checkpoints, if present, are listed with their names. Do not invent a
  model that is not in the list, and do not assume a pipeline for a model that
  has no saved workflow.

If the best model for the task is not installed, say so and offer the closest
installed one. Do not silently substitute.

## Phase 3: Choose or build the workflow

```json
{ "tool": "workflows" }
```

A workflow is the node graph: models, sampler, scheduler, latent size. It lives in
`production/workflows/<name>.json` and is reusable across projects.

1. **Saved workflow exists and fits** → use it. This is the normal case.
2. **No workflow fits** → build one:
   - Start from a saved workflow of the same model family.
   - Or extract the graph from a PNG ComfyUI already produced: the `prompt` chunk
     holds the exact API graph. Prefer this over guessing node names.
   - Keep placeholders `{{prompt}}`, `{{negative}}`, `{{width}}`, `{{height}}`,
     `{{steps}}`, `{{cfg}}`, `{{seed}}` so it stays reusable.
3. **Validate before spending GPU time:**

```json
{ "tool": "validate-workflow", "arguments": { "workflow": "flux2-klein" } }
```

It checks that every `class_type` exists in this ComfyUI, that required inputs are
present, and that enum values are valid. A graph that fails validation will fail
at generation too — fix it first.

4. **Save it for the future.** Write the file to
   `production/workflows/<name>.json` with `name`, `description`, `models`,
   `defaults` and `graph`. Next time it is one call.

Never submit a hand-written graph without validating it. Node names differ
between ComfyUI versions, and a typo costs a failed run and a confused user.

## Phase 4: Write the prompt

Five parts, in this order, in English:

1. **Subject** — singular and concrete: "a red apple", not "fruit".
2. **Style** — "flat vector", "painted texture", "isometric game icon".
3. **Composition** — "centered", "side view", "on a plain white background".
4. **Palette** — the actual colours.
5. **Lighting/quality** — "soft studio light", "clean edges".

Negative prompt is usually empty for Flux. Use it only for a repeated defect.

## Phase 5: Draft cheaply

First pass is a draft: 512–768 px, 8–12 steps. Judge the idea, not the detail.

```json
{ "tool": "generate", "arguments": { "prompt": "...", "width": 512, "height": 512, "steps": 8, "cfg": 4 } }
```

## Phase 6: Look, judge, iterate

The tool returns a file path. **Read that file** — never describe an image you did
not look at. This is the expensive step: ~1–1.5k tokens per look.

Judge in order, stop at the first failure:

1. Subject — is it the thing asked for?
2. Silhouette — readable at a glance, at small size?
3. Style — matches the requested look?
4. Palette — the colours asked for?
5. Artifacts — extra limbs, melted edges, stray objects, garbled text?
6. Usability — fits where it will be used?

Change **one thing per round**. Wrong subject → rewrite part 1. Wrong style →
parts 2 and 5. Wrong colours → part 4. Artifacts → negative prompt only. Almost
right → keep the seed, raise steps to 20–30 and size to 1024.

**Stop after 5 rounds.** Report what was tried and ask for a direction.

## Phase 7: Deliver

- Final image in `production/images/`, 1024×1024, 20–30 steps.
- Save the prompt next to it as `<name>.prompt.txt` with the seed.
- If the image ships in the game, copy it to `assets/` and reference it from
  config, not from the prompt.

## Rules

- **Name the medium first.** Code, Aseprite, or ComfyUI — with a reason.
- **English prompts.** Short and concrete beats long and poetic.
- **No text in images.** Flux renders letters badly; leave space and draw text in
  the game.
- **Validate before generating.** A bad graph wastes a minute and a look.
- **Save every working workflow.** Rebuilding the same graph twice is the waste
  this skill exists to prevent.
- **One change per round.** Otherwise the next verdict is meaningless.
- **Respect the GPU.** One generation at a time; more than ~10 is a decision to
  confirm with the user.

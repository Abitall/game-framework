---
name: comfyui
description: "Create an image on the local GPU: choose the medium, start ComfyUI in one call, build the prompt with references, then look, judge against a checklist and iterate until it is right."
argument-hint: "[what to draw]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

Image generation runs on the user's own GPU through ComfyUI. No cloud, no API
key, no per-image cost. The cost is GPU time and the tokens spent looking at
results.

**One path only.** `status` → `start` → `generate`. Nothing else. No browser
tabs with the ComfyUI editor, no hand-written `curl` calls to its HTTP API, no
scripts that reimplement that API. If a call fails, read its error and fix the
cause; a workaround built beside the tool is how a ten-minute job becomes an
afternoon.

## Phase 1: Choose the medium, and say so

Three ways to make an image. Pick one and say why in one line, before doing
anything.

| Medium | Use it for | Cost |
|---|---|---|
| **Code** (Phaser Graphics, canvas, CSS) | UI frames, bars, gradients, simple icons, particles, procedural patterns | free, instant, no assets to ship |
| **Aseprite** | pixel art: sprites, tiles, icons, spritesheets | cheap, precise, editable by hand |
| **ComfyUI** | illustration, textures, backgrounds, key art, anything painterly | GPU time, tokens per look |

If it can be drawn with rectangles and circles, draw it in code. Generated art
is for pictures, not for bars.

## Phase 2: Start the server, in one call

```json
{ "tool": "status" }
```

If it is not running:

```json
{ "tool": "start" }
```

`start` launches the launcher found in the folder from `production/comfyui.json`
and waits until the server answers. It is idempotent. If it reports that no
launcher was found, fix `production/comfyui.json` `dir` — do not start hunting
through the filesystem.

If it times out, the answer is in the console window ComfyUI opened: missing
model files and CUDA errors are printed there and not returned by the API. Say
what the window shows instead of retrying blindly.

## Phase 3: Choose the model and the workflow

```json
{ "tool": "models" }
{ "tool": "workflows" }
```

Rules:

- Use a saved workflow that fits. Do not invent a graph for a model that has no
  workflow.
- If none fits, start from a saved one of the same family, or extract the graph
  from a PNG ComfyUI already produced (its `prompt` chunk is the exact API
  graph). Prefer that to guessing node names.
- **Validate before spending GPU time** — `validate-workflow` checks classes,
  inputs and enums against the live server.
- Save every working graph to `production/workflows/<name>.json`.

## Phase 4: References are not optional

If the subject already exists as a picture — an earlier accepted image, a style
sample, a portrait of the same character, a texture that must match — use it.

1. **If reference nodes are installed** (`LoadImage` + `IPAdapter`, `ReferenceOnly`,
   `StyleModelApply`), wire the reference in. Check with `validate-workflow`.
2. **If they are not**, read the reference file and write down five concrete
   attributes before prompting: silhouette, palette (actual colours), lighting
   direction, materials, level of detail. Those five go into the prompt.

Never write "in the same style as before" from memory of a conversation. Style
lives in pixels, not in the chat.

For a character or creature, add a **front-facing, full-body, plain background**
shot to the batch first. It is the cheapest way to catch broken anatomy before
it is baked into ten illustrations.

## Phase 5: Write the prompt

Five parts, in this order, English, short and concrete:

1. **Subject** — singular: "a red apple", not "fruit". Count matters: "one
   figure", "two hands".
2. **Style** — "flat vector", "painted texture", "isometric game icon".
3. **Composition** — the part that fixes most bad output:
   - "centered, single subject, symmetrical background"
   - "horizon level", "camera at eye level", "front view"
   - "subject occupies two thirds of the frame", "negative space on the left"
   - "light from the upper left", "single light source"
4. **Palette** — the actual colours, not "warm tones".
5. **Quality** — "clean edges", "sharp focus on the face", "soft studio light".

Anatomy is a prompt problem before it is a model problem. For any figure:
"five fingers on each hand, both hands visible, correct proportions, feet on the
ground". For a crowd: "faces in the background out of focus, no extra limbs".

### About the negative prompt

Read `defaults.cfg` in the workflow file before writing a single negative word.

- **This repository's `flux2-klein` workflow ships `cfg: 5`**, so its negative
  branch is live and the negative text matters. Do not assume "Flux ignores
  negatives" — that is true for guidance-free (`cfg: 1`) variants, not here.
- **`cfg` = 1** (distilled / guidance-free models): the negative branch is
  disconnected — the text is encoded and then ignored. Test it once: set the
  negative to something absurd and regenerate the same seed. If the image is
  identical, stop writing negatives for this workflow.
- **`cfg` > 1**: the negative works. Use a short base, not a paragraph:

```
blurry, deformed hands, extra fingers, extra limbs, asymmetrical eyes,
malformed face, watermark, text, jpeg artifacts
```

If the same defect survives three rounds with a working negative, the negative is
not the problem: the prompt is, or the resolution is too low for the subject size.

## Phase 6: Draft cheaply

512–768 px, 8–12 steps. Judge the idea, not the detail. One look per round.

## Phase 7: Look, then judge against the checklist

The tool returns a path. **Read the file.** Never describe an image you did not
look at. This is the expensive step: about 1–1.5k tokens per look.

Go in this order, stop at the first failure:

1. **Subject** — is it the thing asked for? The right count of things?
2. **Anatomy** (if a figure) — hands with five fingers, no extra or merged
   limbs, one head, eyes level and the same size, ears where ears go, no melted
   neck, feet present.
3. **Frame logic** — one light direction, horizon level, perspective matching
   the camera height, shadows falling the same way, no object floating or
   intersecting, gaze pointing somewhere sensible.
4. **Symmetry** — left and right match where they should (face, costume, frame
   decoration), and deliberately differ where they should. Asymmetric by
   accident looks like a mistake.
5. **Silhouette** — readable at 128 px. Shrink it and look again.
6. **Style and palette** — matches the reference colours, not roughly.
7. **Usability** — fits the space it will occupy, has room for text if text is
   drawn in the game.

## Phase 8: Change one thing

| Verdict | Change |
|---|---|
| wrong subject or count | rewrite part 1 |
| wrong style | parts 2 and 5 |
| wrong colours | part 4 |
| bad anatomy | add the anatomy lines from Phase 5, raise steps, raise size |
| bad composition, floating objects, broken perspective | part 3, and nothing else |
| repeated artifact, `cfg` > 1 | negative prompt |
| almost right | keep the seed, raise steps to 20–30, size to 1024 |

Two changes at once and the next verdict is meaningless.

**Stop after five rounds.** Report what was tried, show the best file, and ask
for a direction. Five rounds of one model is a signal that the model or the
workflow is wrong, not that the sixth prompt will work.

## Phase 9: Accept, and record it

Accepted means it passed the checklist, not that it looks nice.

Write the record next to the file: `<name>.prompt.txt` with the positive prompt,
the negative, model, workflow name, steps, cfg and **seed**. Then add one row to
`production/images/ACCEPTED.md`:

| file | what it is | model | seed | verdict |
|---|---|---|---|---|

The seed is the only way to reproduce a good result. Without it, "make it again
like that one" is impossible and the picture is unrepeatable.

## Colour drift after a restart

The same seed can come back with different colours after ComfyUI is restarted or
updated — sampler precision, VAE or model files change. When colours matter:

1. Keep one known seed per style and regenerate it after any restart.
2. Compare against the saved file. Drift means the pipeline changed, not the
   prompt.
3. Prefer the saved, approved image over a regenerated one of the same prompt.
4. Do not "fix" drift with a colour prompt: the next restart moves it again.

## Rules

- **One path.** `status` → `start` → `generate`. No tabs, no raw API.
- **Name the medium first**, with a reason.
- **References before prompts** for anything that must match something.
- **Validate before generating.** A bad graph wastes a minute and a look.
- **One change per round.** Otherwise the verdict is noise.
- **Look at every file you claim to have seen.**
- **Seed recorded, or it did not happen.**
- **No text in images.** Flux renders letters badly; leave space and draw text
  in the game.
- **Respect the GPU.** One generation at a time; more than ten is a decision to
  confirm with the user.
- **Five rounds, then ask.** A long silent loop burns the GPU and the context.

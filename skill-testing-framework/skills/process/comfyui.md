# Skill Test Spec: /comfyui

## Skill Summary

`/comfyui` generates images on the user's GPU through a local ComfyUI. The agent
writes an English prompt, generates a cheap draft, looks at the file, judges it
against ordered criteria, changes one thing per round, and stops after five
rounds. Final images are saved with their prompt and seed.

## Static Assertions (Structural)

- [ ] Requires the agent to read the produced file before judging
- [ ] Defines the five prompt parts
- [ ] Requires one change per iteration
- [ ] Caps iterations at five and requires reporting when the cap is hit
- [ ] Saves the prompt and seed next to the final image
- [ ] States that the verified pipeline is Flux 2 Klein and not to invent others
- [ ] Forbids text in generated images

## Test Cases

### Case 1: Happy path
**Input:** "нарисуй иконку яблока".
**Expected:** prompt in five parts, 512 px draft at 8 steps, image read, verdict, final at 1024/20 steps, prompt file saved.

### Case 2: Good draft
**Expected:** no further rounds; the agent says it is done and shows the file.

### Case 3: Five rounds without success
**Expected:** stops, lists what was tried, asks the user for a direction.

### Case 4: ComfyUI not running
**Expected:** the tool reports the URL and tells the user to start ComfyUI; no retry loop.

### Case 5: Text requested inside the image
**Expected:** refuses to render text, proposes a blank area and drawing the text in the game.

## Verdict Criteria

- **PASS**: all assertions hold and every case matches.
- **NEEDS WORK**: one deviation.
- **FAIL**: judges an image it did not read, or loops past five rounds silently.

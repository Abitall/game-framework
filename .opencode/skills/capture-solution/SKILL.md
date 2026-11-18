---
name: capture-solution
description: "Turn a working finding into a proposal, then accept or reject it. Accepted findings land in docs/solutions/ by sphere; the framework is never edited silently."
argument-hint: "[sphere] [short title]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question
---

Record what worked while it is fresh, but never apply it silently. A finding is a
proposal first; the user decides whether it becomes knowledge.

## Phase 1: Does it qualify

Record only if at least one is true:

- more than two reworks were needed;
- an engine limitation was worked around;
- a skill, rule, or tool was changed;
- the approach is now used in a second place;
- a bug took more than 30 minutes to find.

If none apply, say so in one line and stop. A journal of routine entries is not read.

## Phase 2: Propose

Pick the sphere and run:

```bash
node tools/learn.mjs propose \
  --title "Column-major board indexing" \
  --sphere code \
  --what "Use indexOf(x, y) from Board.ts instead of y * width + x" \
  --why "Board is column-major; manual math silently transposes" \
  --when "touching board indexing" \
  --source "<session or ADR>"
```

Spheres: `code`, `gameplay`, `ui`, `tests`, `art`, `process`, `tools`.

Add `--global` only if the finding is a rule about how to work on any project.
Project taste stays project-scoped by default.

## Phase 3: Ask

Show the proposal text and ask with `question`:

- Accept — writes to `docs/solutions/<sphere>.md`
- Reject — asks for a one-line reason
- Edit first — revise the wording, then ask again

```bash
node tools/learn.mjs accept <slug>
node tools/learn.mjs reject <slug> --why "too specific to this game"
```

## Phase 4: Offer promotion

If the finding will recur, offer to turn it into a rule:

```bash
node tools/learn.mjs promote <slug>
```

That prints the exact pool file to edit. Never edit `.framework/library/rules/`
without approval, and never edit the active `.opencode/` copy directly — change the
pool, then reinstall.

## Rules

- One finding per proposal. Two findings make the acceptance decision muddy.
- The title states the outcome, not the topic.
- Link an ADR instead of repeating a decision.
- Accepted entries go newest-first; `learn.mjs` handles placement.

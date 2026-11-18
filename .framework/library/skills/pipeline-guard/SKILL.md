---
name: pipeline-guard
description: "Read the project phase from PIPELINE.md, classify the incoming task, and warn when work jumps ahead of unfinished core."
argument-hint: "[task description]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question
---

Protect the order of work. The failure this prevents is real: polishing visuals
while the core loop is still unproven.

The phase and its gates live in exactly one place: `production/PIPELINE.md`.
There is no separate state file.

## Phase 1: Read the state

```bash
node tools/pipeline.mjs status
```

That prints the current phase, the open gates, and a "game first" warning when
recent commits went mostly to tests, docs, or tooling. Do not guess the phase from
memory — read it.

If `production/PIPELINE.md` is missing, say so and offer to create it from
`.framework/library/` defaults before doing anything else.

## Phase 2: Classify the task

| Task kind | Phase |
|---|---|
| core mechanics, data model, determinism | production (early) |
| balance, difficulty curves, tuning | production (late) |
| visuals, effects, achievements, onboarding, audio | polish |
| store, metadata, certification | release |

## Phase 3: Guard

If the task belongs to a later phase than the first open gate, warn before starting:

> This is polish work, but the open gate is "core loop playable end to end".
> Polishing now means redoing it after the core changes. Options: (a) finish the
> core first, (b) do a deliberately cheap placeholder now, (c) proceed anyway and
> accept the rework.

Use `question` with those three options. Never refuse outright — the user may have
a reason — and never proceed silently.

If the task matches the current phase, say nothing and continue. This skill must
not add friction to normal work.

## Phase 4: Update the gates

A gate is closed through the tool, not by editing prose:

```bash
node tools/pipeline.mjs tick "core loop playable"
node tools/pipeline.mjs skip "accessibility modes" --why "deferred to beta"
node tools/pipeline.mjs block "store metadata" --why "waiting on account"
```

Never delete a gate. `status` reports gates that disappeared, because deleting one
is the quietest way to lower the bar.

## Rules

- One source of truth: `production/PIPELINE.md`.
- A gate with `check: <command>` closes itself when the command passes.
- A gate with `check: user` needs an explicit yes.
- A system is done when it is playable and tested, not when code exists.

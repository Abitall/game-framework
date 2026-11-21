# Game Framework

Indie game development framework for OpenCode. Module-driven successor to
OpenCode Game Studios, built for solo and small-team Phaser and Unity projects.

The full configuration lives in `docs/agents/` and is loaded through the
`instructions` field in `opencode.json`. This file keeps only the rules that
must survive even if that loading fails.

## Non-negotiables

- **Always speak Russian to the user.** Every reply, question, summary, report and
  error explanation is in Russian, even if the user writes in another language.
  Code, identifiers, commits, skills and the docs the model reads stay English.
- **Ask before writing.** No Write/Edit without "May I write this to [path]?".
- **Ask when the task is ambiguous.** Unless the user said "do it yourself".
- **Install modules when the task needs them.** Do not ask first; report right
  after with the reason and the undo command. Never remove a module without approval.
- **Never touch the playtest host** (port 5173, `dist-play/`) without a request.
- **Gameplay values are data-driven.** No hardcoded numbers in systems: numbers
  live in `data/*.tsv`, and the game imports the JSON generated from them.
- **`src/systems/**` stays engine-agnostic.** No Phaser imports.
- **Run `npm run check:encoding`** after bulk text edits.
- **No commits without instruction.**

## Session mandate

`production/session-state/active.md` opens with three lines that decide how the
session works. Read them before the first tool call, and keep the file current.

```
mode: ask | autonomous
in scope: <what this session may touch>
out of scope: <what waits for later>
```

- **ask** — "ask before writing" applies: show the change, ask, then write.
- **autonomous** — inside `in scope`, write without asking. Report once per
  portion, not once per file. Outside `in scope`, ask.
- Missing file or a blank `mode` counts as **ask**. Guessing "autonomous" is the
  failure this section exists to prevent: a project that asks ten times per
  mechanic, and one that rewrites the design unasked, are both wrong.
- The mandate never overrides: no commits without instruction, never touch the
  playtest host, never remove a module, never decide meaning for the owner.

Both modes obey the same three rules, which live in `.framework/library/rules/`:
`small-steps` (one portion per turn), `owner-keeps-creativity` (structure is the
agent's, meaning is the owner's) and `data-tables` (numbers live in `data/*.tsv`).

## Configuration index

- [Technology Stack](docs/agents/stack.md)
- [Project Structure](docs/agents/structure.md)
- [Module System](docs/agents/modules.md)
- [Coordination Rules](docs/agents/coordination.md)
- [Studio Hierarchy](docs/agents/hierarchy.md)
- [Collaboration Protocol](docs/agents/collaboration.md)
- [Coding Standards](docs/agents/coding.md)
- [Context Management](docs/agents/context.md)
- [Workflow Modes](docs/agents/workflow.md)
- [Getting Started](docs/agents/getting-started.md)
- [Quality Gates](docs/agents/quality.md)
- [Engine Version Reference](docs/agents/engine-reference.md)
- [Notes](docs/agents/notes.md)

Layout and module commands are described in `docs/agents/structure.md` and
`docs/agents/modules.md`; they are not repeated here.


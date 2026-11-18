# Game Framework

Indie game development framework for OpenCode. Module-driven successor to
OpenCode Game Studios, built for solo and small-team Phaser and Unity projects.

The full configuration lives in `docs/agents/` and is loaded through the
`instructions` field in `opencode.json`. This file keeps only the rules that
must survive even if that loading fails.

## Non-negotiables

- **Ask before writing.** No Write/Edit without "May I write this to [path]?".
- **Ask when the task is ambiguous.** Unless the user said "do it yourself".
- **Install modules when the task needs them.** Do not ask first; report right
  after with the reason and the undo command. Never remove a module without approval.
- **Never touch the playtest host** (port 5173, `dist-play/`) without a request.
- **Gameplay values are data-driven.** No hardcoded numbers in systems.
- **`src/systems/**` stays engine-agnostic.** No Phaser imports.
- **Run `npm run check:encoding`** after bulk text edits.
- **No commits without instruction.**

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


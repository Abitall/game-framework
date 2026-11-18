---
name: init-template
description: "First-time repo setup. Turns the framework checkout into a clean game project: interview, module install, directory skeleton, README, AGENTS.md stack."
argument-hint: "[--reset-git] [--name \"My Game\"] [--engine phaser|unity|godot|unreal|sfml3|raylib|bevy]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question, Task
---

When this skill is invoked:

**Question-tool discipline:** whenever a step says to use `question`, make that
tool call in the same turn, then stop. Do not announce it, describe its arguments
in prose, or write the call as text. Analysis goes in ordinary text before the
call; the user's answer is the next input.

## Phase 1: Parse Arguments

- `--name "My Game"` sets the game name (skips that question)
- `--engine phaser|unity|godot|unreal|sfml3|raylib|bevy` sets the engine (skips that question)
- `--reset-git` offers a git history reset in Phase 7 without prompting

If `--name` and `--engine` are both provided, skip the interview and go to Phase 2.

Otherwise use `question` to gather:

### Tab 1: Project Identity
- **Game name?**
- **One-line description?**

### Tab 2: Engine and Genre
- **Engine?** (phaser / unity / godot / unreal / sfml3 / raylib / bevy)
- **Genre?** (platformer, puzzle, RPG, shooter, strategy, ...)

### Tab 3: Team
- **Team size?** (solo / small 2-5 / medium 6-15 / large 16+)

### Tab 4: Stage
- **Starting point?** (new idea / existing design docs / existing code)

## Phase 2: Install Modules

The five default modules are already active in a fresh checkout:
`core`, `design`, `programming`, `qa`, `release`.

Install the engine module that matches the answer:

```bash
node .framework/install.mjs add engine-phaser     # phaser
node .framework/install.mjs add engine-unity      # unity (6.3 LTS)
node .framework/install.mjs add engine-godot      # godot
node .framework/install.mjs add engine-unreal     # unreal
node .framework/install.mjs add engine-sfml3      # sfml3
node .framework/install.mjs add engine-raylib     # raylib
node .framework/install.mjs add engine-bevy       # bevy
```

Then install the domain and process modules the answers justify. Do not ask
first; report right after:

| Condition | Module |
|---|---|
| >3 screens or accessibility requirements | `ui` |
| second language | `localization` |
| external art assets | `art` |
| recorded audio or music | `audio` |
| story, lore, dialogue | `narrative` |
| discrete levels | `level-design` |
| external data files | `data` |
| >5 architectural modules or >5 ADRs | `architecture` |
| idea search, mechanic validation | `prototyping` |
| >20 systems, multiple contributors | `stories` |
| file-based bug tracking, profiling | `qa-advanced` |
| public launch, live players | `release-launch` |
| telemetry, A/B testing | `analytics` |
| team of 3+ | `team-orchestration` |

Never install "just in case". Each installed module costs context, so the reason
must be an answer the user actually gave. In the report, name the module, the
trigger, what it added, and the undo command.

## Phase 3: Create the Directory Skeleton

Create only what is missing. Never delete existing user content.

```text
src/                 # game code
assets/              # game assets
design/gdd/          # game design documents
design/registry/     # entity registry (entities.yaml)
docs/architecture/   # ADRs
production/sprints/  # sprint plans
production/session-state/
prototypes/
```

Guard every clear operation: if a directory already holds user files, warn and
skip instead of deleting.

## Phase 4: Replace README.md

Write a fresh README.md:

````markdown
# [Game Name]

> [One-line description]

Built with [Engine] on the Game Framework for OpenCode.

## Quick Start

```bash
npm install
npm run dev
```

Type `/start` for onboarding, `/` to browse skills.

## Structure

```
src/          game code
assets/       assets
design/       GDDs and registry
docs/         architecture, ADRs
production/   sprints, session state
.framework/   module pool (do not edit by hand)
.opencode/    active modules
```
````

## Phase 5: Update AGENTS.md

- Set `## Technology Stack` to the chosen engine and version.
- Keep the module advisor rule intact.
- Remove project-specific leftovers that do not apply.
- If AGENTS.md is missing or malformed, warn and skip.

For Phaser, confirm `docs/engine-reference/phaser/VERSION.md` matches the
installed version. For Unity, confirm `docs/engine-reference/unity/VERSION.md`
pins 6.3 LTS unless the user asked for another version.

## Phase 6: Verify

Run and report the output of each:

```bash
node .framework/install.mjs list
node .framework/install.mjs doctor
node .framework/tools/build-manifests.mjs
```

All three must pass before reporting success. If `doctor` reports orphaned
active files, show them and ask before removing.

## Phase 7: Optional Git Reset

If the user passed `--reset-git` or agrees when prompted:

```bash
git checkout --orphan fresh-root
git add -A
git commit -m "Initial commit: scaffolded from the Game Framework template"
```

Warn before any force push: it rewrites remote history for everyone who cloned.

## Phase 8: Summary

```text
Template initialized

  Project: [Game Name]
  Engine:  [Engine]
  Team:    [Size]
  Modules: [installed list]

  What's next:
  - /setup-engine [engine]   pin engine docs
  - /concept-brainstorm      start the game concept
  - /start                   guided onboarding
```

# Phaser — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Phaser 4.2.1 "Giedi" |
| **Release Date** | 2026-07-09 |
| **Project Pinned** | 2026-11-14 |
| **LLM Knowledge Cutoff** | May 2025 |
| **Risk Level** | **HIGH** — Phaser 4 launched in April 2026, after the training cutoff; Phaser 3 knowledge does not transfer safely |
| **Renderer** | WebGL (the Canvas renderer is deprecated in Phaser 4) |
| **Language / Build** | TypeScript 7.0.2 (strict) + Vite 8.3.8 |

## Why this matters

Phaser 4 is not a drop-in continuation of Phaser 3. The renderer was rebuilt,
FX and masks were unified into filters, geometry and data-structure APIs were
replaced, and several game objects were removed. Agents trained on Phaser 3
will produce code that compiles in some cases but fails at runtime in others.

Treat this directory as the source of truth for engine APIs. When an API is not
covered here, verify it against the official Phaser 4 docs before writing code.

## Required reading order

1. `breaking-changes.md` — what changed from Phaser 3 to 4.
2. `deprecated-apis.md` — "don't use X → use Y" tables.
3. `current-best-practices.md` — how to write Phaser 4 code today.
4. `modules/rendering-filters.md` — renderer, filters, and this project's rendering approach.

## Project-specific notes

- The project uses Phaser 4.2.1 with TypeScript 7.0.2 and Vite 8.3.8.
- OCGS has no Phaser engine-specialist module. Load the `phaser-coder` skill
  before writing or editing Phaser code, and route general work to
  `gameplay-programmer`, `performance-analyst`, and `qa-tester`.
- Keep game rules in `src/systems/` as pure TypeScript and test them with
  Vitest; Phaser scene code should only render and forward input.
- Target 60 fps / 16.6 ms frame budget, 1600×900 logical canvas, ≤ 50 draw
  calls, 256 MB memory ceiling.

## Sources

- Phaser 4.0 migration guide: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md>
- Phaser 4.2.0 changelog: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.2/CHANGELOG-v4.2.0.md>
- Phaser 4.2.1 changelog: <https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.2.1/CHANGELOG-v4.2.1.md>
- Phaser 4.2.1 release page: <https://phaser.io/download/release/v4.2.1>
- Phaser 3 vs Phaser 4 overview: <https://phaser.io/news/2026/05/phaser-3-vs-phaser-4>

*Last verified: 2026-11-14*

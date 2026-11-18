# Third-party sources

This framework is derived from and informed by several MIT-licensed projects.
This file records what came from where, so attribution stays intact.

## Derived

| Source | License | What we use |
|---|---|---|
| [OpenCode Game Studios](https://github.com/striderZA/OpenCodeGameStudios) | MIT | Base framework: 52 agents, skills, commands, rules, plugins, docs. Trimmed and restructured. |
| [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) | MIT | Original agent architecture that both frameworks descend from. |

## Adopted ideas and files

| Source | License | What we adopted |
|---|---|---|
| [opencode-game-studio](https://github.com/TraftG/opencode-game-studio) | MIT | 29 document templates in `.framework/library/templates/` (GDD, art and sound bibles, pitch, economy model, risk register, incident response, post-mortem, test plan, sprint plan, release notes, collaboration protocols). Session-example format. |
| [studioigor-skill](https://github.com/studioigor/studioigor-skill) | MIT | Concepts reimplemented in TypeScript: executable pipeline gates (`tools/pipeline.mjs`), scope contract with tamper detection (`tools/scope.mjs`), proposal/approval learning loop (`tools/learn.mjs`), blind A/B with sealed key (`tools/ab.mjs`, `tools/reveal.mjs`), tuning-panel pattern (skill), game-first warning. |

No source file from studioigor was copied: its scripts are Python for Claude Code
and assume macOS tooling. The mechanisms were reimplemented for Node and OpenCode.

## Deliberately not adopted

| Source | Why not |
|---|---|
| TraftG bash hooks | Not wired in OpenCode; our TypeScript plugins are wired and tested |
| TraftG `permission` / `agent` config keys | Deprecated in the OpenCode schema; `permissions` (ruleset) and agent frontmatter are current |
| studioigor `CronCreate` autopilot | Claude Code specific; a Windows scheduler equivalent is future work |
| studioigor single mega-skill | Contradicts the module split |
| GameMaker agents | Not our stack |

## Notes

- Both adopted repositories are MIT; the licence text and copyright notice of each
  remain with the upstream project.
- Templates were edited for our stack (Phaser 4 / Unity 6 instead of
  Godot/Unity/Unreal/GameMaker) and for our directory layout.
- When porting more material, add a row here in the same commit.

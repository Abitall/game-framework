# Project Structure

```text
/
├── AGENTS.md                     # this file — project configuration
├── opencode.json                 # plugins, MCP, permissions
├── .framework/                   # THE FRAMEWORK (inert, never auto-loaded)
│   ├── library/                  # pool: every agent, skill, command, rule
│   │   ├── agents/               # 52 agent definitions
│   │   ├── skills/               # 90 skills
│   │   ├── commands/             # 90 slash commands
│   │   └── rules/                # 16 path-scoped coding rules
│   ├── modules/                  # 31 module manifests
│   ├── tools/                    # manifest generator
│   └── install.mjs               # module installer
├── .opencode/                    # ACTIVE: only installed modules live here
│   ├── agents/  skills/  commands/  rules/
│   ├── modules/installed.json    # source of truth for what is active
│   └── plugins/                  # ccgs-hooks, drift-detector, changelog-generator
├── docs/                         # framework docs, engine references, solutions journal
├── design/                       # GDDs, entity registry
├── src/                          # game code
├── assets/                       # game assets
├── production/                   # sprints, PIPELINE.md gates, SCOPE.md contract, session state
├── prototypes/                   # throwaway prototypes
├── tests/                        # framework self-tests
└── tools/                        # project tooling
```

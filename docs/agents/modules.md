# Module System

The framework ships 28 modules but installs 6. Only installed modules exist in
`.opencode/`, so uninstalled modules cost zero context.

```bash
node .framework/install.mjs list                    # all modules and status
node .framework/install.mjs info engine-phaser      # contents and triggers
node .framework/install.mjs add engine-phaser       # install (deps resolved)
node .framework/install.mjs remove art              # uninstall, keeps edits
node .framework/install.mjs capture art             # push active edits to pool
node .framework/install.mjs status
node .framework/install.mjs doctor
```

`node .opencode/modules/install.mjs ...` is a compatibility shim for the same CLI.

### Installed by default

| Module | Contents |
|---|---|
| `core` | 3 directors, 18 skills, 3 rules (workflow, pipeline, solutions, encoding) |
| `design` | 3 designers, 10 skills (GDDs, balance, review) |
| `programming` | 5 programmers, 5 rules |
| `qa` | 4 QA agents, 8 skills, 2 rules (tests, long runs) |
| `release` | 2 agents, 8 skills (sprints, milestones, changelog, repo) |
| `templates` | 29 document templates (GDD, bibles, pitch, risk register, test plan, protocols) |

### Available on demand

| Module | Install when |
|---|---|
| `engine-phaser` | project uses Phaser |
| `engine-unity` / `engine-godot` / `engine-unreal` / `engine-sfml3` / `engine-raylib` / `engine-bevy` | project uses that engine |
| `architecture` | >5 architectural modules or >5 ADRs |
| `ui` | >3 screens or accessibility requirements |
| `localization` | a second language is needed |
| `art` | external art assets or sprite pipeline |
| `audio` | recorded audio or music |
| `narrative` | story, lore, or dialogue |
| `level-design` | discrete levels or rooms |
| `live-ops` | game already shipped |
| `data` | external data files or content tables |
| `prototyping` | idea search or mechanic validation |
| `stories` | large project, >20 systems, multiple contributors |
| `qa-advanced` | bugs tracked as files, profiling, pre-release hardening |
| `release-launch` | public launch, live players |
| `team-orchestration` | team of 3+ people |
| `analytics` | telemetry, A/B testing, analytics backend |

### Module advisor rule

**If a task needs a capability that lives in an uninstalled module, propose it.**

1. Name the module and give a one-line reason.
2. Show the exact command: `node .framework/install.mjs add <module>`.
3. Wait for approval. Never install silently.
4. After approval, install, then continue the task.

Check `node .framework/install.mjs list` before claiming a capability is
missing. Typical triggers: engine choice → `engine-*`; second language →
`localization`; telemetry → `analytics`; file-based bug tracking →
`qa-advanced`; public launch → `release-launch`.

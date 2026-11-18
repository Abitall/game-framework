# Scope contract

The contract is what the game promises the player. Each line has a countable
target, so "done" is a number, not a feeling.

Rules:

- Lines are **never deleted**. Mark a line `BLOCKED: <why>` instead.
- Ticking a line that is short is the same as deleting it — `tools/scope.mjs`
  reports both.
- `count:` is a JavaScript expression with `fs`, `path` and `root` available.
  It must return a number. JavaScript keeps the check identical on every OS.
- Guard for missing directories: `fs.existsSync(dir) ? … : 0`.

Run: `node tools/scope.mjs`

## Contract

- [ ] playable systems: 8 — count: fs.existsSync('src/systems') ? fs.readdirSync('src/systems').filter(f => f.endsWith('.ts')).length : 0
- [ ] design documents: 8 — count: fs.existsSync('design/gdd') ? fs.readdirSync('design/gdd').filter(f => f.endsWith('.md')).length : 0
- [ ] test files: 8 — count: fs.existsSync('tests') ? fs.readdirSync('tests').filter(f => f.endsWith('.test.ts')).length : 0
- [ ] architecture decisions: 3 — count: fs.existsSync('docs/architecture') ? fs.readdirSync('docs/architecture').filter(f => /^adr-.*\.md$/.test(f)).length : 0
- [ ] config file exists: 1 — count: fs.existsSync('src/config/config.ts') ? 1 : 0
- [ ] playtest snapshot published: 1 — count: fs.existsSync('dist-play/.published') ? 1 : 0

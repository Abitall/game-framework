# Coding Standards

- All game code includes doc comments on public APIs
- Every system has an architecture decision record in `docs/architecture/`
- Gameplay values are data-driven (external config), never hardcoded
- Public methods are unit-testable (dependency injection over singletons)
- Commits reference the relevant design document or task ID
- **Verification-driven development**: write tests first for gameplay systems.
  For UI changes, verify with screenshots. Every implementation needs a way to
  prove it works.
- **Long-running test harnesses** (frequency, metrics, interval sweeps) write
  resumable checkpoints at a fixed cadence and expose progress percentage.
  Estimate the duration before starting; over 60 seconds, warn and offer
  checkpoints, sharding, or a smaller sweep. See `rules/long-tests.md`.
- **Playtest host**: the agent works on the dev host (**port 5174**); the human
  plays on **port 5173**, which serves `dist-play/`. Never touch 5173 or
  `dist-play/`; publish only on request with `/publish-play`. See
  `rules/web-hosting.md`.
- **Text encoding**: all source and docs are UTF-8. Never rewrite files with
  PowerShell `Get-Content`/`Set-Content` unless both use explicit UTF-8; prefer
  the edit/write tools or Node `fs` with `utf8`. `npm run check:encoding` fails
  on common mojibake and runs in pre-commit. See `rules/encoding.md`.
- **Hybrid CPU scheduling**: on an Intel i5-14600KF (6 P-cores with HT =
  logical 0-11, 8 E-cores = logical 12-19), put fast shards (random/passive) on
  E-cores and long shards (perfect/mixed) on P-cores with
  `tools/run-affinity.ps1 -Class e|p -Command "..."`; keep workers within 8 (E)
  and 12 (P). Fast-only runs may use all cores with up to 20 workers. Leave
  affinity to the OS on unknown topologies.
- **Solutions journal**: when a task needed more than two reworks, an engine
  limitation was worked around, or a rule or skill changed, record it with
  `/capture-solution` in `docs/solutions/<sphere>.md`. See `rules/solutions.md`.

# Quality Gates

Before merging to `development`:

- **Framework validation** — `npm run test:framework` checks agent, skill and
  command structure in `.framework/library/`.
- **Plugin tests** — `npm run test:plugins` covers the three TypeScript plugins.
- **Git hooks** — `npm run test:hooks`; `.githooks/commit-msg` enforces
  Conventional Commits; `.githooks/pre-commit` blocks credentials, conflict
  markers and >20 MB files, and runs framework validation when its paths are
  staged.
- **Module integrity** — `node .framework/tools/build-manifests.mjs` fails if a
  library item belongs to no module or a module claims a missing file.
- **Doctor** — `node .framework/install.mjs doctor` fails on orphaned active
  files.

---
name: publish-play
description: "Build the playtest snapshot into dist-play/ so the human can play on port 5173. Run only when the user asks."
argument-hint: "[--mode production|development]"
user-invocable: true
allowed-tools: Read, Bash
---

Publish what the human will play. This is the only supported way to change the
playtest host.

## Why this exists

The agent works on the dev host (port 5174). The human plays on port 5173, which
serves `dist-play/`. If the agent rebuilt that directory on every change, the
human could never finish a run. So the snapshot changes only here, on request.

## Phase 1: Check

```bash
git status --porcelain
```

If there are uncommitted changes, say so in one line — the snapshot will include
them. Ask whether to proceed.

## Phase 2: Publish

```bash
npm run publish:play
```

`tools/publish-play.mjs` builds into `dist-play/` and writes a `.published`
timestamp. If the build fails, the previous snapshot stays untouched — say that
explicitly, because the human can keep playing.

## Phase 3: Report

Report, in this order:

1. whether the build succeeded;
2. the publish timestamp;
3. the URL: `http://localhost:5173`;
4. one line on what changed since the last publish, if known.

If the playtest host is not running, tell the user to start it with `npm run play`.

## Never

- Never run this skill on your own initiative.
- Never touch port 5173 or `dist-play/` by any other means.
- Never delete `dist-play/` while the human may be playing.

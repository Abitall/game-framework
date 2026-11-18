---
name: repo-sync
description: "Review staged changes, write a Conventional Commits message, and push. Always asks before pushing."
argument-hint: "[optional scope or intent]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, question
---

Commit and push the current work. Push is never automatic.

## Phase 1: Inspect

```bash
git status --porcelain
git diff --stat
git diff
```

Summarise in plain language: what changed, why, and which files are unrelated
leftovers that should not be committed.

## Phase 2: Safety

Stop and ask if any of these appear:

- a secret, token, or `.env` file in the diff
- a file over 20 MB
- generated output (`dist/`, `dist-play/`, `node_modules/`)
- conflict markers (`<<<<<<<`, `>>>>>>>`)
- changes to `.framework/library/` without a matching manifest update

## Phase 3: Message

Conventional Commits, scope optional:

```
<type>(<scope>): <subject>

<body: why, not what>
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`.

Propose the message, then ask with `question`:

- Commit and push
- Commit only
- Edit the message first
- Cancel

## Phase 4: Execute

```bash
git add <explicit paths>
git commit -m "<subject>" -m "<body>"
git push            # only if the user chose push
```

Stage explicit paths, not `git add -A`, unless the user asked for everything.
Never force-push; it is denied in `opencode.json`.

## Phase 5: Report

Branch, commit hash, subject, and whether the push succeeded. If the push was
rejected, show the remote message and propose `git pull --rebase` — do not run it
without approval.

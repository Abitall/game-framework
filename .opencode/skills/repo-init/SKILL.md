---
name: repo-init
description: "Create a GitHub repository for the current project, wire the remote, and push the first commit. Requires the GitHub CLI."
argument-hint: "[--name repo-name] [--public] [--description \"...\"]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question
---

Create the cloud repository for this project. Never push anywhere until the user
has confirmed the name and visibility.

## Phase 1: Preflight

```bash
git rev-parse --is-inside-work-tree
gh --version
gh auth status
```

- Not a git repo → run `git init -b main` after asking.
- `gh` missing → stop and give the install command for the platform
  (`winget install --id GitHub.cli`, `brew install gh`), then ask the user to run
  `gh auth login` once. Do not attempt to install it silently.
- `gh auth status` not logged in → ask the user to run `gh auth login` in their
  terminal. Never ask for a token in chat.

## Phase 2: Identity

Use `question` for anything not passed as an argument:

- repository name (default: the directory name, lowercased, dashes)
- visibility (default: **private**)
- one-line description (default: the first heading of `README.md`)

## Phase 3: Prepare the tree

1. Confirm `.gitignore` covers `node_modules/`, `dist/`, `dist-play/`, `.env*`,
   and `production/session-logs/`.
2. Confirm no secrets are staged: `git status --porcelain`, then scan the staged
   diff for `_TOKEN|_SECRET|password|api[_-]?key`.
3. If the working tree has no commits, stage everything and commit:

```bash
git add -A
git commit -m "chore: initial commit"
```

## Phase 4: Create and push

```bash
gh repo create <name> --private --description "<description>" --source . --remote origin --push
```

Use `--public` only when the user chose public. Report the repository URL.

## Phase 5: Verify

```bash
git remote -v
git log --oneline -1
gh repo view --json url,visibility,defaultBranchRef
```

Report: URL, visibility, branch, first commit hash. If any step failed, report the
exact command and error; do not retry blindly.

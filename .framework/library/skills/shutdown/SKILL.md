---
name: shutdown
description: "Shut the machine down after a long task finishes, but only when the user asked for it. Arms at the start, fires on success, cancels on failure."
argument-hint: "[arm|cancel|status]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

The user leaves a long task running overnight. If it finishes in an hour, the
machine should not idle until morning.

The danger is the opposite case: shutting down while the user is still working.
So the command has a two-step guard.

## Phase 1: Arm, only on an explicit request

Arm when the user said something like "выключи компьютер после", "можно
выключать", "оставлю на ночь". Do **not** arm because a task looks long, and do
not arm on your own initiative.

```bash
node tools/shutdown.mjs arm --reason "ночной прогон баланса"
```

The reason is the user's words, short. It goes into `production/shutdown.json`.

If the user did not ask, skip this skill entirely. Do not mention it.

## Phase 2: Work

Do the task normally. No special behaviour.

## Phase 3: Finish

**Before anything else**, write the outcome where it survives the shutdown:

- the final report into `production/session-logs/` (or `production/session-state/active.md`);
- anything the user must see tomorrow, in the file, not in the chat.

Then decide:

| Task ended… | Action |
|---|---|
| success | `node tools/shutdown.mjs now` |
| success, but the user is clearly still around | `node tools/shutdown.mjs cancel` and say why |
| failure, blocked, or waiting for input | `node tools/shutdown.mjs cancel`, report the blocker |

`now` schedules the shutdown with a 90-second delay, so `cancel` still works if
you change your mind in that window.

## Phase 4: Report

The user may not read the chat: the machine is off. Keep the last message short
and factual — what was done, where the report is, whether the machine will shut
down.

## Rules

- **Never arm without an explicit request.** A shutdown nobody asked for is a
  lost night of work.
- **Never shut down on failure.** Cancel, and leave the machine on so the user can
  look at the problem.
- **Commit or warn.** `now` warns about uncommitted changes; mention them in the
  report. Uncommitted work survives a shutdown, unrecorded decisions do not.
- **The marker expires.** `now` refuses a marker older than 12 hours, so a stale
  arm from yesterday cannot fire by accident.
- **Cancelling is cheap.** If anything is uncertain, cancel and say so.

---
paths:
  - "src/**"
  - "design/**"
  - "docs/**"
  - "production/**"
  - "data/**"
---

# Small Steps

One portion per turn. A portion is one thing a person can check in a minute:

- one mechanic, end to end — state, data entry, what the player sees, one test;
- or one document — one system GDD, one ADR, one review report;
- or one fix.

Then stop, report, and wait. **Not** two mechanics, not "the mechanic plus the
screen it obviously needs next", not a batch of five GDDs in one pass.

## The report

Three lines, no essay:

1. what changed — file paths;
2. how to check it — a command, or what to click;
3. what is deliberately not done yet.

## Why the stop is not negotiable

A large diff hides defects: the owner cannot tell which line broke the game, so
the whole change gets re-reviewed, and re-review is the slowest thing in the
project. A small diff is either obviously right or obviously wrong.

The agent reads as much as it needs. It writes one portion. Reading is cheap to
undo; writing is not.

## When a portion grows

If the portion turns out to need a second subsystem, stop before writing it and
say so. Do not split it silently into "obvious" pieces and do not widen the diff
to make it work: an honest stop costs one message, a silent widening costs a day.

Do not fix unrelated files inside a portion. Note them in the report instead.

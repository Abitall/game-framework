# Pipeline — phases and gates

The current phase is the first one with an open gate. Gates are **never deleted**:
tick them (`node tools/pipeline.mjs tick "..."`), reopen, skip with a reason, or
block with a reason. Deleting a gate is the quietest way to lower the bar, so
`status` reports any gate that disappeared.

Gate kinds:

- `check: <command>` — run automatically by `pipeline.mjs check`; ticked on exit 0
- `check: manual` — the agent judges and ticks after showing evidence
- `check: user` — only after an explicit "yes" from the user

**The order that matters.** Gates exist to stop a phase from being declared done
on paper. The most expensive mistake this pipeline guards against is designing a
system before anyone can play it: documents about an unplayable system can
neither be proven nor refuted, so they pile up and drift apart, and every later
fix invents a new contradiction.

One playable mechanic is worth more than ten pages of design. So the order is:
concept → **playable skeleton with one mechanic** → core systems → architecture
→ the rest of the mechanics, one at a time. A phase never opens the next one
while its playable gate is open.

## Phase 0 — Start

files:
- [ ] project under git — check: git rev-parse --is-inside-work-tree
- [ ] framework modules installed — check: node .framework/install.mjs doctor
- [ ] engine module matches the stack — check: manual

## Phase 1 — Concept and playable skeleton

files: design/gdd/game-concept.md, src/
- [ ] concept approved by the user — check: user
- [ ] 3-5 falsifiable pillars written — check: manual
- [ ] scope boundary stated (what this game is not) — check: manual
- [ ] the skeleton builds and its tests pass — check: npm run check:slice
- [ ] one core mechanic is playable by hand in the skeleton — check: user

## Phase 2 — Design

files: design/gdd/systems-index.md
- [ ] at most five core systems are active; the rest are backlog — check: node tools/systems-count.mjs
- [ ] every active system already has a mechanic that can be played — check: user
- [ ] every active GDD has a /design-review report, none MAJOR REVISION NEEDED — check: manual
- [ ] a /consistency-check report exists with no open conflicts — check: manual
- [ ] a /review-all-gdds report exists, verdict PASS or CONCERNS — check: manual
- [ ] core loop GDD approved — check: user

## Phase 3 — Architecture

files: docs/architecture/architecture.md
- [ ] architecture document accepted — check: user
- [ ] at least one ADR for the risky decision — check: manual
- [ ] control manifest lists who may change what — check: manual

## Phase 4 — Pre-production

files: src/
- [ ] dev host runs on port 5174 — check: manual
- [ ] playtest host runs on port 5173 — check: manual
- [ ] core loop playable end to end — check: user
- [ ] first playtest recorded — check: manual

## Phase 5 — Production

- [ ] every system has tests for its critical path — check: manual
- [ ] balance pass done with numbers, not opinions — check: manual
- [ ] no hardcoded gameplay values — check: manual
- [ ] encoding check clean — check: node tools/check-encoding.mjs

## Phase 6 — Polish

- [ ] first 60 seconds reviewed — check: user
- [ ] accessibility modes verified — check: manual
- [ ] performance within budget — check: manual
- [ ] solutions journal reviewed for reusable entries — check: manual

## Phase 7 — Release

- [ ] release checklist complete — check: manual
- [ ] playtest snapshot published and approved — check: user
- [ ] changelog written — check: manual

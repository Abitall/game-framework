---
paths:
  - "src/**"
  - "tests/**"
  - "design/**"
  - "docs/**"
  - "tools/**"
  - ".framework/**"
---

# Solutions Journal Rules

The journal lives in `docs/solutions/`, one file per sphere: `code.md`,
`gameplay.md`, `ui.md`, `tests.md`, `art.md`, `process.md`, `tools.md`.

Record a solution when **any** of these is true:

- the task needed more than two reworks;
- an engine limitation was worked around;
- a skill, rule, or framework tool was changed;
- the same approach is now used in a second place;
- a bug took more than 30 minutes to find.

Do not record:

- routine implementation that follows an existing pattern;
- decisions with alternatives and consequences — those are ADRs.

## Entry format

```markdown
## YYYY-MM-DD — Short title

**Problem:** what was wrong, in one or two sentences.
**Tried:** what did not work and why.
**Worked:** the approach that did work.
**Why:** the reason it works, not just what it is.
**Reuse:** where else this applies.
**Links:** ADR id, file paths, commit.
```

Rules:

- Newest entry at the top of the sphere file.
- Title states the outcome, not the topic: "Deterministic cascade without
  recursion", not "Cascade notes".
- Keep it under ~15 lines. A solution nobody rereads is worthless.
- Never duplicate an ADR. Link to it instead.
- At the end of a project, `/retrospective` reads the journal and proposes which
  entries should become rules or skills.

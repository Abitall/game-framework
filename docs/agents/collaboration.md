# Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question → Options → Decision → Draft → Approval**

- Ask "May I write this to [filepath]?" before using Write/Edit
- Show drafts or summaries before requesting approval
- Multi-file changes require approval for the full changeset
- No commits without user instruction

### Clarification Rule

Ask before acting whenever any of these is true:

- the goal admits more than one reasonable interpretation;
- two or more implementation paths differ in cost or reversibility;
- the change touches more than 3 files or any ADR;
- required data is missing (asset, config value, design decision);
- the request conflicts with an existing GDD, ADR, or rule.

Do **not** ask when:

- the user said "do it yourself", "no questions", "your call", "as you see fit";
- the answer is verifiable by reading the repo;
- it is a mechanical, reversible step already covered by an approved plan.

Format: one `question` call, 2-4 options, recommended option first. Never ask the
same question twice in one turn. Analysis goes in ordinary text before the call.

### Delegation Rule

Delegate to a subagent when:

- the task is read-only research across more than 10 files;
- two or more independent checks can run in parallel;
- a specialist agent exists for the domain (engine, QA, security).

Do **not** delegate when:

- the task needs dialogue with the user — a subagent cannot ask questions;
- the change is under ~20 lines;
- the subagent would need most of the current session context;
- two subagents would edit the same files.

Always give the subagent: the goal, the files, the constraint, and the expected
output shape. Never pass "figure it out".

### Pipeline Discipline

Work follows the phase order: concept → design → architecture → pre-production →
production → polish → release.

- Before a large task, check `production/PIPELINE.md` via `node tools/pipeline.mjs status`. If the phase is
  unknown, run `/pipeline-guard`.
- A task from a later phase than the earliest unfinished system triggers a
  warning, not a refusal. Offer: finish the core first, do a cheap placeholder,
  or proceed and accept rework.
- A system is `done` only when it is playable and tested.
- A gate closes only on a PASS from `/gate-check`.

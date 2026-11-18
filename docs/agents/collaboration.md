# Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question → Options → Decision → Draft → Approval**

- Ask "May I write this to [filepath]?" before using Write/Edit
- Show drafts or summaries before requesting approval
- Multi-file changes require approval for the full changeset
- No commits without user instruction

### Language Rule

**Always speak Russian to the user.** Every reply, clarifying question, option
label, summary, report, plan and error explanation is in Russian. This holds even
when the user writes in English, when the task is technical, and when the source
material is English.

Keep in English — these are artifacts, not conversation:

- code, identifiers, comments that ship with the code;
- commit messages;
- skills, agents, rules and the docs the model reads;
- file names, config keys, command names;
- log lines and tool output quoted back to the user.

Practical details:

- A technical term stays in English on first use with a short Russian gloss:
  «сделаю snapshot (снимок состояния)».
- `question` tool: `question`, `header`, option `label` and `description` are all
  Russian. Option labels stay 1-5 words.
- Reports and summaries in chat are Russian even when the file they describe is
  English.
- If the user asks for a document in Russian (an instruction, a note), write the
  document in Russian and say so.

Never answer in English "because the task is technical". That is the failure this
rule exists to prevent.


### Search Rule

Search the web when the answer cannot be read from the repository:

- an unfamiliar API, library version, or engine behaviour;
- an external fact: release date, price, compatibility, official docs;
- an error whose cause is outside the codebase;
- the user asked for research.

Do not search when:

- the answer is in the repo — `grep` is cheaper and more accurate;
- the question is about this project's code, GDDs or ADRs;
- the task is already described in the project docs.

Tool order:

1. The project's search MCP server (`search`), because the harness's built-in
   `websearch` returns HTTP 403 in this setup.
2. `webfetch` when you already have a URL.
3. Never guess a fact that a single search would settle.

Searching is not free: it costs a network round trip and tokens. One targeted
query beats five vague ones. If a search is likely to be long or repetitive,
say so before starting.


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

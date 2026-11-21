---
paths:
  - "**"
---

# Subagent Rules

A subagent exists for one reason: the answer comes back **better or faster** than
doing it in the main session. Quality first — a fast answer that has to be redone
is slower. If neither improves, do the work yourself.

The main session holds the conversation and the user's intent. A subagent does
not, cannot ask a question, and will confidently answer the wrong question. Give
it work that survives that.

## The test before delegating

Answer all three, in one line each. Any "no" means do it yourself.

1. **What exactly comes back?** A file, a table, a diff. If you cannot name the
   artifact, you are delegating a vague feeling.
2. **How will I check it?** Two or three rows against the source, by hand. If a
   wrong answer would look exactly like a right one, do not delegate.
3. **Is it cheaper here?** Under ~10 files, the delegation prompt costs more than
   the read.

Delegate when:

- the research is read-only and spans more than ~10 files;
- two or more independent checks can run at once;
- a specialist agent owns the domain (engine, QA, security);
- the task is extraction from documents that already exist.

Do not delegate when:

- the task needs a decision, a trade-off, or taste — that belongs to the user or
  to the main session;
- the task is creative: names, prose, tone, "what this system should feel like";
- the answer needs dialogue (a subagent cannot ask);
- the change is under ~20 lines;
- two agents would edit the same file;
- the instruction would be "figure it out" or "make it better".

## The prompt

Every delegation carries: the goal in one sentence, the **exact file list**, the
question, the output shape, and the constraint.

- **One narrow question per agent.** "Extract every numeric constant from these
  five GDDs" is a task. "Review the design" is a wish.
- **Give the file list.** "Read what you need" produces a tour of the repository
  and a summary of things you already know.
- **Forbid the extras explicitly:** no recommendations, no refactor proposals, no
  rewritten documents unless asked.
- **Never ask for opinions as facts.** "Does this look complete?" returns
  "looks complete" whatever the file says.

## The output shape

A table, one row per finding, nothing else:

| id | finding | source | severity |
|---|---|---|---|
| `TR-needs-014` | water drains 12 per night | `design/gdd/needs.md:88` | major |

- **Every row cites `file:line`.** A row without a source is a guess until proven
  otherwise, and it is the first row to be wrong.
- **Stable ids** in `<PREFIX>-<slug>-NNN` form, so a later report can cite a
  finding instead of pasting it.
- **No prose sections.** No "summary", no "conclusion", no "recommendations"
  column invented on the way.

## Checking the result

Read the source for two or three rows, picked at random. One wrong row means
reread all of them — the rows are not independent, they come from the same
misunderstanding. Do not accept an output because the table is neat.

Report what was delegated in one line: what came back, what you checked, what you
kept. A delegation nobody verified is context spent for nothing.

## What goes wrong without this rule

Recorded from a real project:

- Four agents extracted requirements from 20 GDDs into 178 rows. Worked, and was
  worth it: the table was checkable.
- The same 20 GDDs were reviewed **after** all of them were written: 92 blocking
  findings arrived at once, and fixing one invalidated the next. Review the batch
  in parallel with writing the following one.
- A subagent was asked what a system should feel like. The prose came back
  plausible, wrong, and expensive: the owner had to read the wrong meaning before
  correcting it. Creative work stays in the main session, with the owner.

## Never

- Never let a subagent make a binding decision or edit a design document's meaning.
- Never trust a verdict ("PASS", "complete", "consistent") — only its evidence.
- Never run a subagent in parallel with edits to the files it reads.
- Never delegate the same question to two agents and average the answers; run the
  checks in parallel only when they look at different things.

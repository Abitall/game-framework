---
name: obsidian
description: "Write ideas, concepts, plans and documents into the Obsidian vault in Russian, with wikilinks between them. Search before creating, link every note, keep the map cards current."
argument-hint: "[idea|concept|plan|document|question] [title]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question
---

The vault is the user's thinking space: ideas, concepts, plans, open questions.
It is written **in Russian**, because only the user reads it. The project itself
stays in English.

The vault is a plain folder of markdown. Obsidian indexes it on its own, so no
plugin or server is involved.

## Phase 1: Find the vault

```bash
node tools/obsidian.mjs vault
```

Resolution order: `--vault`, `OBSIDIAN_VAULT`, `production/obsidian.json`.
Never guess the path and never write outside it.

If the folder is missing, ask before creating it — the user may have moved the
vault. Then `node tools/obsidian.mjs init` creates the folder structure and the
templates.

## Phase 2: Search before creating

```bash
node tools/obsidian.mjs search "<ключевые слова>"
```

If a similar note exists, **link to it instead of creating a duplicate**. Two
notes about the same idea are worse than one imperfect note.

Search both the title and the body; the command does both.

## Phase 3: Create the note

```bash
node tools/obsidian.mjs new идея "Короткое название"
```

Types: `идея`, `концепт`, `план`, `документ`, `вопрос`. The command refuses a
duplicate title, which is what you want.

Fill the body from the conversation. One note = one thought. If you are writing
"and also", that is a second note.

## Phase 4: Link and index

Replace the empty `[[ ]]` in **Связи** with **at least two real links**, then:

```bash
node tools/obsidian.mjs index
```

That rebuilds `50 Карты/Карта — <тип>.md`. Those files are generated; never edit
them by hand.

## Phase 5: Report

One short block: note title, folder, the links you added. Nothing else.

## Note format

```markdown
---
type: идея
status: черновик
project: Numtris
created: 2026-11-18
tags: [механика, каскад]
---

# Короткое название

Суть в двух-трёх предложениях.

## Связи

- [[Как устроено]]
- [[Карта — идея]]
```

Keys stay Latin (`type`, `status`, `tags`) because Obsidian and future queries
read them; values and all prose are Russian.

## Rules

- **Russian only.** Titles, body, tags, statuses.
- **Titles are link targets.** Short, unique, no `:`, `/`, `\`, `?`, `*`, `"`,
  `<`, `>`, `|`. The command strips them, but a clean title is better.
- **Never edit a note you did not create** without asking. The user's notes are
  their own; add links from your notes to theirs instead.
- **No project specs here.** GDDs, ADRs and story files live in the project.
  The vault holds thinking, not specification.
- **No secrets.** No tokens, keys, passwords.

## Keeping it healthy

```bash
node tools/obsidian.mjs check
```

Reports broken links, duplicate titles and orphans. Run it after a batch of
notes, not after every single one.

## What to record

| Signal | Note type |
|---|---|
| "а что если…", a mechanic worth trying | `идея` |
| a game idea worth developing | `концепт` |
| a sprint, a milestone, a checklist | `план` |
| a decision with reasoning | `документ` |
| an open question you cannot answer yet | `вопрос` |

Do not record: routine work logs, code, anything already in the project docs.

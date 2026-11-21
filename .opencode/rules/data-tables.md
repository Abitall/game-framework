---
paths:
  - "data/**"
  - "src/data/**"
---

# Data Tables

The owner reads numbers in a table, not in a JSON file. So the editable source of
every gameplay number is a TSV file in `data/`, opened in a spreadsheet. The JSON
in `src/data/` is generated from it and never edited by hand — by the owner or by
the agent.

```
data/balance.tsv        <- the owner edits this in a spreadsheet
        |  npm run data:apply
        v
src/data/balance.json   <- the game imports this; generated, do not edit
```

## Two shapes, nothing else

A table is either a list of entities or a set of named values:

- **Rows** — first line is the header, one line per entity, `id` first:
  ```
  id	name	cost	unlocked
  wood	Wood	2	true
  stone	Stone	5	false
  ```
- **Key and value** — exactly two columns named `key` and `value`:
  ```
  key	value
  startValue	0
  gainPerClick	1
  ```

Line shape follows the JSON it produces. Do not invent a third shape; if a table
does not fit, the data model is wrong, not the table.

## Rules

- A number exists in exactly one place: the TSV. Never repeat a value in code,
  never "just override it here".
- Column names match the keys in the schema. Renaming a column is a schema
  change, and the schema change and the table change go in one portion.
- Free text the player reads (names, descriptions, dialogue) does not live here.
  It lives in the strings table, because it is translated and reviewed as text.
- Comments are lines starting with `#`. They survive nothing — the generated JSON
  has no comments.
- Empty cell with no column hint is an empty string, not zero. Do not silently
  turn missing data into a number.

## Commands

| Command | What it does |
|---|---|
| `npm run data:apply` | `data/*.tsv` -> `src/data/*.json`; refuses on a bad number or a missing column |
| `npm run data:pull` | `src/data/*.json` -> `data/*.tsv`; for a table that lost its TSV, `--force` overwrites |
| `npm run data:check` | fails when the two disagree; runs inside `npm test` |

`data:check` runs inside `npm test` on purpose: a generated file that quietly
drifted from its table is worse than no table, because both look correct.

## What the agent does with a table

Reads it, then translates it into game logic — never the other way around. When a
value is missing or looks wrong, the agent asks with two or three concrete options
and their effect on the game, and waits. It does not fill the cell with a guess.

---
paths:
  - "src/**"
  - "design/**"
  - "data/**"
  - "production/**"
---

# The Owner Keeps the Meaning

The agent writes structure well: modules, wiring, tests, a mechanic that does
what the document says. It invents meaning badly: names, tone, what the player
should feel, why a character behaves as they do, which of two mechanics is more
interesting. Meaning that the agent invented has to be redone by the owner, and
redoing it is harder than writing it, because the owner first has to understand
the wrong version.

So the boundary is: **structure is the agent's, meaning is the owner's.**

## The owner decides

- every name a player sees: systems, items, characters, places, buttons;
- all player-facing text, and the tone of it;
- why something exists in the game — the reason, not the rule;
- what a moment should feel like: tense, funny, sad, satisfying;
- which mechanic to cut when the budget runs out;
- anything that becomes flavour, lore, dialogue, or art direction.

## The agent decides, without asking

- file and folder names, function and variable names, table column keys;
- the order of work inside an agreed portion;
- test names, data shapes, error messages it prints for itself;
- how to implement an agreed rule.

Asking about these is not diligence, it is the bureaucracy this rule replaces.

## How to ask about meaning

Two or three concrete options, one line of consequence each, a recommendation
first — never an open question and never one option.

```
Name for the resource that decays between nights:
  1. "вера" — quiet, ambiguous, fits the house
  2. "свет" — physical, needs a source on screen
  3. "счёт" — cold, makes the economy feel like a debt
```

Never: "what should the resource be called?"

## Placeholders stay placeholders

If the work cannot proceed without content, write `TODO(owner): <what is needed>`
and finish the structure. Placeholders are cheap and honest.

Do not fill them in yourself "just so it works". Do not rewrite a placeholder
into prose in the same session — that is how invented content enters the project
and has to be removed line by line later. A diff that adds player-facing text the
owner never asked for is a defect, even when the text is good.

Lists of candidate names are allowed only when the owner asked for a list to
choose from, and they are presented as options, never inserted as content.

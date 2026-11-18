---
paths:
  - "src/**"
  - "design/**"
  - "docs/**"
  - "production/**"
  - "assets/**"
---

# Encoding Rules

- Every source, document, and data file is UTF-8 without BOM.
- Never rewrite a file with PowerShell `Get-Content` / `Set-Content` unless both
  calls pass an explicit UTF-8 encoding. Use the edit/write tools, or Node `fs`
  with `"utf8"`.
- Cyrillic, em dashes, arrows and other non-ASCII characters are allowed in
  content, but they are the first thing to break. After any bulk edit of text
  that contains them, run `npm run check:encoding`.
- Config tables and localization files are the highest-risk place: a single
  mojibake string ships to players. Check them even when the code compiles.
- A replacement character `U+FFFD` anywhere is a bug, not a display quirk.
- Do not "fix" mojibake by retyping the line from the terminal: read the original
  bytes with Node `fs.readFileSync(path, "utf8")` and rewrite deliberately.
- The pre-commit hook runs the encoding check on any staged text file. Do not
  bypass it with `OCGS_SKIP_HOOK_CHECKS=1` unless the user asks.

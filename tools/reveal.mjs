#!/usr/bin/env node
/**
 * Reveal a gauntlet round — only after the verdict is written.
 *
 * Refuses to open key.json until verdict.md has a `WINNER: A|B|TIE` line and
 * exactly one `GAP:` line with text. That is the whole point: a verdict written
 * before the answer cannot be fitted to the answer.
 *
 * Usage:
 *   node tools/reveal.mjs <round dir>
 */
import fs from "node:fs"
import path from "node:path"

const round = process.argv[2]
if (!round) {
  console.error("usage: node tools/reveal.mjs <round dir>")
  process.exit(2)
}

const verdictPath = path.join(round, "verdict.md")
const keyPath = path.join(round, "ab", "key.json")

if (!fs.existsSync(verdictPath)) {
  console.error("reveal: verdict.md not found — write the verdict first")
  process.exit(2)
}
if (!fs.existsSync(keyPath)) {
  console.error("reveal: ab/key.json not found — run tools/ab.mjs first")
  process.exit(2)
}

const verdict = fs.readFileSync(verdictPath, "utf8")
const winner = verdict.match(/^\s*WINNER:\s*(A|B|TIE)\s*$/m)
const gaps = [...verdict.matchAll(/^\s*GAP:\s*(.+)$/gm)].map((m) => m[1].trim()).filter(Boolean)

if (!winner) {
  console.error("reveal: verdict.md needs exactly one line `WINNER: A|B|TIE`")
  process.exit(1)
}
if (gaps.length !== 1) {
  console.error(`reveal: verdict.md needs exactly one non-empty GAP line (found ${gaps.length})`)
  process.exit(1)
}

const key = JSON.parse(fs.readFileSync(keyPath, "utf8"))
const side = winner[1]
const outcome = side === "TIE" ? "tie" : key[side] === "candidate" ? "win" : "loss"

const reveal = [
  "",
  "---",
  "",
  "## Reveal",
  "",
  `- A was: **${key.A}**`,
  `- B was: **${key.B}**`,
  `- Winner: **${side}**`,
  `- Outcome for us: **${outcome}**`,
  `- Gap: ${gaps[0]}`,
  `- Revealed: ${new Date().toISOString()}`,
  "",
].join("\n")

fs.appendFileSync(verdictPath, reveal, "utf8")
fs.writeFileSync(path.join(round, "outcome.json"), `${JSON.stringify({ ...key, winner: side, outcome, gap: gaps[0] }, null, 2)}\n`, "utf8")

const ledger = path.join(path.dirname(path.dirname(round)), "LEDGER.md")
const row = `| ${new Date().toISOString().slice(0, 10)} | ${path.basename(round)} | ${side} | ${outcome} | ${gaps[0].replace(/\|/g, "/")} |\n`
if (!fs.existsSync(ledger)) {
  fs.writeFileSync(ledger, "| Date | Round | Winner | Outcome | Gap |\n|---|---|---|---|---|\n", "utf8")
}
fs.appendFileSync(ledger, row, "utf8")

console.log("")
console.log(`  A = ${key.A}`)
console.log(`  B = ${key.B}`)
console.log(`  Winner: ${side}  ->  ${outcome}`)
console.log(`  Gap: ${gaps[0]}`)
console.log("")

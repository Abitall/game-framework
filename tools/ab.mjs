#!/usr/bin/env node
/**
 * Blind pair for a gauntlet round.
 *
 * Copies the reference bar and our capture into <round>/ab/A.* and B.* in random
 * order, then writes the key to <round>/ab/key.json. The key is not opened until
 * the verdict is written; `reveal.mjs` enforces that.
 *
 * Why: an agent grading its own work is soft. A blind pair with a sealed key
 * removes the chance to fit the verdict to the answer.
 *
 * Usage:
 *   node tools/ab.mjs --round .studio/gauntlet/screens/rounds/01 --ref bar.png --cand ours.png
 */
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] ?? "" : ""
}

const round = flag("round")
const ref = flag("ref")
const cand = flag("cand")

if (!round || !ref || !cand) {
  console.error("usage: node tools/ab.mjs --round <dir> --ref <bar image> --cand <our image>")
  process.exit(2)
}
if (!fs.existsSync(ref) || !fs.existsSync(cand)) {
  console.error("ab: one of the images does not exist")
  process.exit(2)
}

const abDir = path.join(round, "ab")
fs.mkdirSync(abDir, { recursive: true })

const refExt = path.extname(ref) || ".png"
const candExt = path.extname(cand) || ".png"
const ext = refExt === candExt ? refExt : ".png"

const flip = crypto.randomInt(0, 2) === 0
const sides = flip ? { A: ref, B: cand } : { A: cand, B: ref }

fs.copyFileSync(sides.A, path.join(abDir, `A${ext}`))
fs.copyFileSync(sides.B, path.join(abDir, `B${ext}`))

const key = {
  A: flip ? "reference" : "candidate",
  B: flip ? "candidate" : "reference",
  ref,
  cand,
  createdAt: new Date().toISOString(),
}
fs.writeFileSync(path.join(abDir, "key.json"), `${JSON.stringify(key, null, 2)}\n`, "utf8")

const verdictPath = path.join(round, "verdict.md")
if (!fs.existsSync(verdictPath)) {
  fs.writeFileSync(
    verdictPath,
    [
      "# Verdict",
      "",
      "Write the verdict BEFORE running reveal. Do not open key.json.",
      "",
      "WINNER:",
      "GAP:",
      "",
      "Notes:",
      "",
    ].join("\n"),
    "utf8",
  )
}

console.log("")
console.log(`  Round: ${round}`)
console.log(`  Open:  ${path.join(abDir, `A${ext}`)}`)
console.log(`         ${path.join(abDir, `B${ext}`)}`)
console.log(`  Write: ${verdictPath}`)
console.log("  Rules: one winner, one gap. Do not open key.json before the verdict.")
console.log("")

#!/usr/bin/env node
/**
 * Count the active systems in `design/gdd/systems-index.md` and fail past the cap.
 *
 * Why this exists: an index grows one reasonable row at a time, and every row
 * costs a GDD, four reviews, an owner and a dependency edge. In practice the
 * number of systems is the single best predictor of whether a project ships, so
 * it is checked by a script instead of trusted to prose.
 *
 * Only the table under `## System Enumeration` counts. Everything under
 * `## Backlog` and `## Cut` is allowed to be as long as the author likes.
 *
 * Usage: node tools/systems-count.mjs [--limit 5]
 */

import fs from "node:fs"
import path from "node:path"

const DEFAULT_LIMIT = 5
const ROOT = process.cwd()
const INDEX = path.join(ROOT, "design", "gdd", "systems-index.md")

function limitFromArgs() {
  const flag = process.argv.indexOf("--limit")
  if (flag === -1 || flag + 1 >= process.argv.length) return DEFAULT_LIMIT
  const value = Number(process.argv[flag + 1])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_LIMIT
}

function isTableRow(line) {
  return line.trimStart().startsWith("|")
}

function cells(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim())
}

function isSeparator(line) {
  return cells(line).every((cell) => /^:?-{2,}:?$/.test(cell))
}

function isPlaceholder(line) {
  return /\[/.test(line)
}

/** Active rows only: the table under the "System Enumeration" heading. */
function readActiveSystems(text) {
  const active = []
  let section = ""
  for (const line of text.split(/\r?\n/)) {
    const heading = /^##\s+(.*)$/.exec(line)
    if (heading) {
      section = heading[1].trim().toLowerCase()
      continue
    }
    if (!section.startsWith("system enumeration")) continue
    if (!isTableRow(line) || isSeparator(line) || isPlaceholder(line)) continue
    const [id, name] = cells(line)
    if (!id || /^id$/i.test(id)) continue
    active.push(`${id}${name ? ` ${name}` : ""}`)
  }
  return active
}

const limit = limitFromArgs()

if (!fs.existsSync(INDEX)) {
  console.log("systems: no design/gdd/systems-index.md yet — nothing to count")
  process.exit(0)
}

const active = readActiveSystems(fs.readFileSync(INDEX, "utf8"))

if (active.length <= limit) {
  console.log(`systems: ${active.length} active (cap ${limit})`)
  process.exit(0)
}

const excess = active.slice(limit)
console.error(`systems: ${active.length} active, cap is ${limit}`)
console.error("")
console.error("  Move these to Backlog or Cut, with the reason, before writing more:")
for (const entry of excess) console.error(`    - ${entry}`)
console.error("")
console.error("  A system that cannot be played yet cannot be designed. Ship one, then")
console.error("  promote the next from Backlog.")
process.exit(1)

#!/usr/bin/env node
/**
 * Scope contract: what exists versus what `production/SCOPE.md` promises.
 *
 * Each contract line carries `count:` — a JavaScript expression evaluated with
 * `fs`, `path` and `root` in scope. It must return a number. JavaScript instead
 * of shell keeps the check identical on Windows, macOS and Linux.
 *
 * The script keeps a baseline of line names. If a line disappeared, it says so:
 * deleting a contract line is the quietest way to lower the bar. Ticking a line
 * that is short is reported too.
 *
 * Usage:
 *   node tools/scope.mjs [--json]
 *
 * Exit 0 when every line is MET or BLOCKED.
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const FILE = path.join(ROOT, "production", "SCOPE.md")
const BASELINE = path.join(ROOT, "production", ".scope-baseline.json")

const GATE = /^- \[( |x|X)\]\s+(.+)$/
const META = /\s+(?:—|--)\s+count:\s*(.+)$/i

function load() {
  if (!fs.existsSync(FILE)) {
    console.error("Scope: production/SCOPE.md not found.")
    process.exit(2)
  }
  const text = fs.readFileSync(FILE, "utf8")
  const body = text.split(/^##\s+Contract\s*$/m)[1] ?? text
  const lines = []
  for (const raw of body.split(/\r?\n/)) {
    const match = raw.trim().match(GATE)
    if (!match) continue
    let label = match[2].trim()
    let expr = ""
    const meta = label.match(META)
    if (meta) {
      expr = meta[1].trim()
      label = label.slice(0, meta.index).trim()
    }
    const head = label.match(/^(.+?):\s*(\S+)\s*(.*)$/)
    lines.push({
      name: (head ? head[1] : label).trim(),
      target: head ? Number(head[2].replace(/\D/g, "")) || 0 : 0,
      unit: head ? head[3].trim() : "",
      expr,
      ticked: match[1].toLowerCase() === "x",
      blocked: /BLOCKED:/i.test(label),
    })
  }
  return { lines, text }
}

function count(expr) {
  if (!expr || expr === "manual") return { value: null, note: "not counted" }
  try {
    const fn = new Function("fs", "path", "root", `"use strict"; return (${expr});`)
    const value = fn(fs, path, ROOT)
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { value: null, note: "did not return a number" }
    }
    return { value, note: "" }
  } catch (error) {
    return { value: null, note: error.message.split("\n")[0].slice(0, 70) }
  }
}

const { lines } = load()
const json = process.argv.includes("--json")

const results = lines.map((line) => {
  const { value, note } = count(line.expr)
  const status = line.blocked
    ? "BLOCKED"
    : value === null
      ? "UNCOUNTED"
      : line.target > 0 && value >= line.target
        ? "MET"
        : "SHORT"
  return { ...line, have: value, status, note }
})

const names = results.map((r) => r.name)
const known = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).names ?? [] : []
const gone = known.filter((k) => !names.includes(k))
if (results.length && gone.length === 0) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ names: [...new Set([...known, ...names])].sort() }, null, 2)}\n`, "utf8")
}

if (json) {
  console.log(JSON.stringify({ lines: results, deleted: gone }, null, 2))
} else {
  console.log("")
  console.log(`  Scope — ${path.basename(ROOT)}`)
  if (!results.length) {
    console.log("  No contract lines yet — SCOPE.md is still the template.")
    process.exitCode = 1
  } else {
    const width = Math.max(...results.map((r) => r.name.length))
    for (const r of results) {
      const mark = { MET: "x", SHORT: "·", BLOCKED: "!", UNCOUNTED: "?" }[r.status]
      const have = r.have === null ? "?" : r.have
      console.log(`  ${mark} ${r.name.padEnd(width)}  ${have}/${r.target} ${r.unit}  ${r.status}${r.note ? `   ${r.note}` : ""}`)
      if (r.status === "MET" && !r.ticked) console.log(`      -> target reached; tick the line in SCOPE.md`)
      if (r.status === "SHORT" && r.ticked) console.log(`      -> ticked but short; that is the same as deleting it`)
    }
    const met = results.filter((r) => r.status === "MET" || r.status === "BLOCKED").length
    console.log(`\n  ${met}/${results.length} lines met or blocked`)
  }
  if (gone.length) {
    console.log(`\n  ! contract lines missing: ${gone.length}`)
    for (const g of gone) console.log(`      ${g}`)
    console.log("    Lines are never deleted — tick or mark BLOCKED: <why>.")
  }
  console.log("")
}

const open = results.filter((r) => r.status === "SHORT" || r.status === "UNCOUNTED")
process.exitCode = open.length || gone.length ? 1 : 0

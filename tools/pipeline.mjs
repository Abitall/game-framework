#!/usr/bin/env node
/**
 * Pipeline gates with executable checks.
 *
 * `production/PIPELINE.md` holds phases and gates. A gate is never deleted: it is
 * ticked, reopened, skipped with a reason, or blocked with a reason. Skipping a
 * gate silently lowers the bar, so the file is watched for removed gates.
 *
 * Usage:
 *   node tools/pipeline.mjs status [--check]
 *   node tools/pipeline.mjs check
 *   node tools/pipeline.mjs tick "<part of gate text>"
 *   node tools/pipeline.mjs reopen "<part of gate text>"
 *   node tools/pipeline.mjs skip "<part of gate text>" --why "reason"
 *   node tools/pipeline.mjs block "<part of gate text>" --why "reason"
 *
 * Gate syntax:
 *   - [ ] text — check: <shell command>
 *   - [ ] text — check: manual
 *   - [ ] text — check: user
 *   - [x] text
 *   - [~] text — skip: reason
 *   - [!] text — block: reason
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const FILE = path.join(ROOT, "production", "PIPELINE.md")
const BASELINE = path.join(ROOT, "production", ".pipeline-baseline.json")

const GATE = /^- \[( |x|X|~|!)\]\s+(.+)$/
const META = /\s+(?:—|--)\s+(check|skip|block):\s*(.+)$/i

function load() {
  if (!fs.existsSync(FILE)) {
    console.error("Pipeline: production/PIPELINE.md not found.")
    process.exit(2)
  }
  const text = fs.readFileSync(FILE, "utf8")
  const lines = text.split(/\r?\n/)
  const phases = []
  let phase = null
  lines.forEach((line, index) => {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      phase = { title: heading[1], index, gates: [] }
      phases.push(phase)
      return
    }
    const gate = line.match(GATE)
    if (!gate || !phase) return
    const mark = gate[1].toLowerCase()
    let body = gate[2].trim()
    let meta = ""
    const metaMatch = body.match(META)
    if (metaMatch) {
      meta = `${metaMatch[1].toLowerCase()}: ${metaMatch[2].trim()}`
      body = body.slice(0, metaMatch.index).trim()
    }
    const state = mark === "x" ? "done" : mark === "~" ? "skipped" : mark === "!" ? "blocked" : "open"
    phase.gates.push({ line: index, text: body, meta, state })
  })
  return { text, lines, phases }
}

function save(lines) {
  fs.writeFileSync(FILE, lines.join("\n"), "utf8")
}

function findGate(phases, needle) {
  const lower = needle.toLowerCase()
  const matches = []
  for (const phase of phases) {
    for (const gate of phase.gates) {
      if (gate.text.toLowerCase().includes(lower)) matches.push({ phase, gate })
    }
  }
  if (matches.length === 0) throw new Error(`no gate matches "${needle}"`)
  if (matches.length > 1) {
    throw new Error(`ambiguous "${needle}": ${matches.map((m) => m.gate.text).join(" | ")}`)
  }
  return matches[0]
}

function setMark(lines, gate, mark, suffix) {
  const original = lines[gate.line]
  const stripped = original.replace(/^- \[( |x|X|~|!)\]/, `- [${mark}]`)
  const withoutMeta = stripped.replace(META, "").replace(/\s+$/, "")
  lines[gate.line] = suffix ? `${withoutMeta} — ${suffix}` : withoutMeta
}

function runCheck(command) {
  const result = spawnSync(command, {
    shell: true,
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  })
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() }
}

function walk(dir, extension) {
  if (!fs.existsSync(dir)) return []
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full, extension))
    else if (entry.name.endsWith(extension)) found.push(full)
  }
  return found
}

/**
 * The stop-cock for a project that is planning instead of playing.
 *
 * Design documents about a system nobody has played cannot be wrong, so they
 * never get corrected — they accumulate. Past this threshold the honest advice
 * is to stop writing and build one mechanic by hand.
 */
function paperFirstWarning() {
  const designDocs = walk(path.join(ROOT, "design", "gdd"), ".md")
    .filter((file) => !/[\\/]reviews?[\\/]/i.test(file))

  const code = [...walk(path.join(ROOT, "src"), ".ts"), ...walk(path.join(ROOT, "src"), ".js")]
    .filter((file) => !file.endsWith(".d.ts"))
  const prototypes = walk(path.join(ROOT, "prototypes"), ".md")

  const playable = code.length > 0 || prototypes.length > 0
  if (playable) return null
  if (designDocs.length < 6) return null

  return `${designDocs.length} design documents in design/gdd and nothing playable in src/ or prototypes/. Writing cannot tell you whether the game is fun; playing can.`
}

function gameFirstWarning() {
  const result = spawnSync("git", ["log", "--pretty=%s", "-n", "15"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  })
  if (result.status !== 0) return null
  const subjects = result.stdout.split(/\r?\n/).filter(Boolean)
  if (subjects.length < 6) return null

  const isNonGame = (subject) =>
    /^(test|docs|chore|ci|build)(\(|:)/i.test(subject) ||
    /\b(tests?|docs?|tooling|lint|refactor)\b/i.test(subject)

  const nonGame = subjects.filter(isNonGame).length
  if (nonGame < Math.ceil(subjects.length * 0.6)) return null
  return `${nonGame} of the last ${subjects.length} commits went to tests, docs, or tooling. The game itself is not moving.`
}

function cmdStatus(runChecks) {
  const { phases, lines } = load()

  if (runChecks) {
    for (const phase of phases) {
      for (const gate of phase.gates) {
        if (gate.state !== "open" || !gate.meta.startsWith("check: ")) continue
        const command = gate.meta.slice("check: ".length).trim()
        if (command === "manual" || command === "user") continue
        if (runCheck(command).ok) setMark(lines, gate, "x", "")
      }
    }
    save(lines)
    return cmdStatus(false)
  }

  const current = phases.find((p) => p.gates.some((g) => g.state === "open"))
  const open = phases.flatMap((p) => p.gates.filter((g) => g.state === "open"))

  console.log("")
  console.log(`  Pipeline — ${path.basename(ROOT)}`)
  console.log(`  Phase: ${current ? current.title : "complete"}`)
  console.log("")

  for (const phase of phases) {
    const done = phase.gates.filter((g) => g.state === "done").length
    const marks = phase.gates.map((g) => ({ open: "·", done: "x", skipped: "~", blocked: "!" }[g.state])).join("")
    const isCurrent = current === phase
    console.log(`  ${isCurrent ? ">" : " "} ${phase.title.padEnd(28)} ${done}/${phase.gates.length}  ${marks}`)
  }

  console.log("")
  if (open.length === 0) {
    console.log("  No open gates.")
  } else {
    console.log("  Next:")
    for (const gate of open.slice(0, 5)) {
      const kind = gate.meta.startsWith("check: user") ? "[user]" : gate.meta.startsWith("check: manual") ? "[manual]" : ""
      console.log(`    - ${gate.text} ${kind}`.trimEnd())
    }
    if (open.length > 5) console.log(`    … and ${open.length - 5} more`)
  }

  const warnings = [
    [gameFirstWarning(), "Consider returning to gameplay before more infrastructure."],
    [paperFirstWarning(), "Build one mechanic by hand before writing the next document."],
  ].filter(([text]) => text)
  for (const [text, advice] of warnings) {
    console.log("")
    console.log(`  ! ${text}`)
    console.log(`    ${advice}`)
  }
  console.log("")

  // Tamper check: a gate that existed and disappeared. Gates are compared by
  // their text, not "phase::text", so renaming a phase is not a deletion.
  const names = phases.flatMap((p) => p.gates.map((g) => g.text))
  const stored = fs.existsSync(BASELINE)
    ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).gates ?? []
    : []
  const known = stored.map((entry) => {
    const split = entry.lastIndexOf("::")
    return split === -1 ? entry : entry.slice(split + 2)
  })
  const gone = known.filter((k) => !names.includes(k))
  if (gone.length) {
    console.log(`  ! ${gone.length} gate(s) disappeared from PIPELINE.md:`)
    for (const g of gone) console.log(`      ${g}`)
    console.log("    Gates are never deleted — tick, skip, or block them with a reason.")
  }
  fs.writeFileSync(BASELINE, `${JSON.stringify({ gates: [...new Set([...known, ...names])] }, null, 2)}\n`, "utf8")
  if (gone.length) process.exitCode = 1
}

function cmdMark(mode, needle, why) {
  const { phases, lines } = load()
  const { gate } = findGate(phases, needle)
  if (mode === "tick") setMark(lines, gate, "x", "")
  if (mode === "reopen") setMark(lines, gate, " ", "")
  if (mode === "skip") setMark(lines, gate, "~", `skip: ${why}`)
  if (mode === "block") setMark(lines, gate, "!", `block: ${why}`)
  save(lines)
  console.log(`  ${mode}: ${gate.text}`)
}

function cmdCheck() {
  const { phases, lines } = load()
  let passed = 0
  let failed = 0
  for (const phase of phases) {
    for (const gate of phase.gates) {
      if (gate.state !== "open" || !gate.meta.startsWith("check: ")) continue
      const command = gate.meta.slice("check: ".length).trim()
      if (command === "manual" || command === "user") continue
      const result = runCheck(command)
      if (result.ok) {
        setMark(lines, gate, "x", "")
        passed++
        console.log(`  x ${gate.text}`)
      } else {
        failed++
        console.log(`  · ${gate.text}  (${result.output.split("\n")[0] || "failed"})`)
      }
    }
  }
  save(lines)
  console.log(`\n  ${passed} gate(s) passed, ${failed} still open.`)
  if (failed) process.exitCode = 1
}

const [command = "status", ...rest] = process.argv.slice(2)
const whyIndex = rest.indexOf("--why")
const why = whyIndex >= 0 ? rest[whyIndex + 1] ?? "" : ""
const needle = rest.filter((a, i) => !a.startsWith("--") && i !== whyIndex + 1).join(" ")

try {
  switch (command) {
    case "status": cmdStatus(rest.includes("--check")); break
    case "check": cmdCheck(); break
    case "tick":
    case "reopen":
      cmdMark(command, needle, why); break
    case "skip":
    case "block":
      if (!why) throw new Error(`--why is required for ${command}`)
      cmdMark(command, needle, why); break
    default:
      throw new Error(`unknown command: ${command}`)
  }
} catch (error) {
  console.error(`  error: ${error.message}`)
  process.exitCode = 2
}

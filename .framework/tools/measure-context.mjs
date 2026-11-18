/**
 * Measures context cost for a framework layout.
 *
 * Standing = what the model sees before doing anything: agent descriptions,
 * skill descriptions, command descriptions, always-loaded instruction files.
 * On-demand = rules and reference documents, read only when relevant.
 * Invoked = the average body size of a skill, paid only when that skill is used.
 *
 * Usage: node .framework/tools/measure-context.mjs <variant> [root]
 *   variants: base | ours | ogs | si | final
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(HERE, "../..")
const CHARS_PER_TOKEN = 4

function walk(dir, filter) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, filter))
    else if (!filter || filter(full)) out.push(full)
  }
  return out
}

function frontmatterField(file, field) {
  const text = fs.readFileSync(file, "utf8").slice(0, 4000)
  const match = text.match(new RegExp(`^${field}:\\s*(.+)$`, "m"))
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : ""
}

function bodyChars(file) {
  const text = fs.readFileSync(file, "utf8")
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? text.length - match[0].length : text.length
}

function described(label, files) {
  const descriptions = files.reduce((sum, f) => sum + frontmatterField(f, "description").length, 0)
  const bodies = files.reduce((sum, f) => sum + bodyChars(f), 0)
  return {
    label,
    kind: "standing",
    count: files.length,
    standingTokens: Math.round(descriptions / CHARS_PER_TOKEN),
    avgBodyTokens: files.length ? Math.round(bodies / files.length / CHARS_PER_TOKEN) : 0,
    allBodiesTokens: Math.round(bodies / CHARS_PER_TOKEN),
  }
}

function plain(label, files, kind = "ondemand") {
  const chars = files.reduce((sum, f) => sum + fs.statSync(f).size, 0)
  return {
    label,
    kind,
    count: files.length,
    standingTokens: Math.round(chars / CHARS_PER_TOKEN),
    avgBodyTokens: 0,
    allBodiesTokens: 0,
  }
}

const md = (f) => f.endsWith(".md")

const layouts = {
  base: () => {
    const lib = path.join(ROOT, ".agents")
    return [
      described("agents", walk(path.join(lib, "agents"), md)),
      described("skills", walk(path.join(lib, "skills"), (f) => f.endsWith("SKILL.md"))),
      described("commands", walk(path.join(lib, "commands"), md)),
      plain("rules", walk(path.join(lib, "rules"), md)),
      plain("AGENTS.md", [path.join(ROOT, "AGENTS.md")], "standing"),
    ]
  },
  ours: () => {
    const active = path.join(ROOT, ".opencode")
    return [
      described("agents", walk(path.join(active, "agents"), md)),
      described("skills", walk(path.join(active, "skills"), (f) => f.endsWith("SKILL.md"))),
      described("commands", walk(path.join(active, "commands"), md)),
      plain("rules", walk(path.join(active, "rules"), md)),
      plain("instructions", [path.join(ROOT, "AGENTS.md"), ...walk(path.join(ROOT, "docs", "agents"), md)], "standing"),
    ]
  },
  ogs: () => {
    const lib = path.join(ROOT, ".opencode")
    return [
      described("agents", walk(path.join(lib, "agents"), md)),
      described("skills", walk(path.join(lib, "skills"), (f) => f.endsWith("SKILL.md"))),
      plain("rules", walk(path.join(lib, "rules"), md)),
      plain("OPENCODE.md", [path.join(ROOT, "OPENCODE.md")], "standing"),
    ]
  },
  si: () => {
    const skill = path.join(ROOT, "SKILL.md")
    return [
      described("skill", fs.existsSync(skill) ? [skill] : []),
      plain("references", walk(path.join(ROOT, "references"), md)),
    ]
  },
}

layouts.final = layouts.ours

const rows = layouts[process.argv[2] ?? "final"]()
const standing = rows.filter((r) => r.kind !== "ondemand").reduce((sum, r) => sum + r.standingTokens, 0)
const onDemand = rows.filter((r) => r.kind === "ondemand").reduce((sum, r) => sum + r.standingTokens, 0)

console.log(JSON.stringify({ variant: process.argv[2] ?? "final", root: ROOT, rows, standingTokens: standing, onDemandTokens: onDemand }, null, 2))

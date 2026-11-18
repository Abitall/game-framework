/**
 * Rewrites agent frontmatter from .framework/agent-routing.json.
 *
 * Managed fields: description (kept), mode, model, steps.
 * Legacy `maxTurns` is migrated to `steps` — `maxTurns` is not in the
 * OpenCode agent schema and was silently ignored.
 *
 * Run: node .framework/tools/build-agents-config.mjs [--check]
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const AGENTS = path.join(ROOT, ".framework", "library", "agents")
const ROUTING = path.join(ROOT, ".framework", "agent-routing.json")

const checkOnly = process.argv.includes("--check")

const routing = JSON.parse(fs.readFileSync(ROUTING, "utf8"))
const base = {
  model: routing.default?.model ?? null,
  mode: routing.default?.mode ?? "subagent",
  steps: routing.default?.steps ?? 20,
}

const MANAGED = new Set(["mode", "model", "steps", "maxTurns", "maxSteps"])

function splitFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return null
  return {
    head: match[1],
    body: text.slice(match[0].length),
    raw: match[0],
  }
}

function linesOf(head) {
  return head.split(/\r?\n/).filter((line) => line.trim().length > 0)
}

let changed = 0
const report = []

for (const file of fs.readdirSync(AGENTS).filter((f) => f.endsWith(".md"))) {
  const name = file.replace(/\.md$/, "")
  const full = path.join(AGENTS, file)
  const text = fs.readFileSync(full, "utf8")
  const parts = splitFrontmatter(text)
  if (!parts) {
    report.push(`skip ${file}: no frontmatter`)
    continue
  }

  const override = routing.agents?.[name] ?? {}
  const mode = override.mode ?? base.mode
  const model = override.model ?? base.model
  const steps = override.steps ?? base.steps

  const kept = []
  for (const line of linesOf(parts.head)) {
    const key = line.match(/^([A-Za-z0-9_-]+):/)?.[1]
    if (key && MANAGED.has(key)) continue
    kept.push(line)
  }

  const managed = [`mode: ${mode}`]
  if (model) managed.push(`model: ${model}`)
  managed.push(`steps: ${steps}`)

  const nextHead = [...kept, ...managed].join("\n")
  const next = `---\n${nextHead}\n---\n${parts.body}`
  if (next !== text) {
    changed++
    if (!checkOnly) fs.writeFileSync(full, next, "utf8")
  }
}

if (checkOnly) {
  console.log(`Agent config check: ${changed} file(s) would change`)
  if (changed) process.exitCode = 1
} else {
  console.log(`Agent config: ${changed} file(s) rewritten from .framework/agent-routing.json`)
}
for (const line of report) console.log(`  ${line}`)

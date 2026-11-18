#!/usr/bin/env node
/**
 * Switch the model used by agents.
 *
 * Usage:
 *   node tools/change-model.mjs opencode/big-pickle
 *   node tools/change-model.mjs anthropic/claude-sonnet-4 --only qa-tester,qa-lead
 *   node tools/change-model.mjs --clear
 *   node tools/change-model.mjs --show
 *
 * Writes .framework/agent-routing.json, then rewrites agent frontmatter.
 * Nothing here talks to a provider: an unknown model simply fails at runtime.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROUTING = path.join(ROOT, ".framework", "agent-routing.json")

const args = process.argv.slice(2)
const onlyIndex = args.indexOf("--only")
const only = onlyIndex >= 0 ? (args[onlyIndex + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : []
const model = args.find((a, i) => !a.startsWith("--") && i !== onlyIndex + 1) ?? null

const routing = JSON.parse(fs.readFileSync(ROUTING, "utf8"))

if (args.includes("--show")) {
  console.log(`default: ${routing.default.model ?? "(inherit)"}  mode=${routing.default.mode}  steps=${routing.default.steps}`)
  for (const [name, cfg] of Object.entries(routing.agents ?? {})) {
    if (cfg.model) console.log(`${name}: ${cfg.model}`)
  }
  process.exit(0)
}

if (args.includes("--clear")) {
  routing.default.model = null
  for (const cfg of Object.values(routing.agents ?? {})) delete cfg.model
  fs.writeFileSync(ROUTING, `${JSON.stringify(routing, null, 2)}\n`, "utf8")
  runBuild()
  console.log("Cleared model overrides: agents inherit the session model.")
  process.exit(0)
}

if (!model) {
  console.error("usage: node tools/change-model.mjs <provider/model> [--only a,b] [--clear|--show]")
  process.exit(1)
}

if (only.length) {
  routing.agents ??= {}
  for (const name of only) {
    routing.agents[name] ??= {}
    routing.agents[name].model = model
  }
} else {
  routing.default.model = model
  for (const cfg of Object.values(routing.agents ?? {})) delete cfg.model
}

fs.writeFileSync(ROUTING, `${JSON.stringify(routing, null, 2)}\n`, "utf8")
runBuild()
console.log(`Model set to ${model} for ${only.length ? only.join(", ") : "all agents"}.`)

function runBuild() {
  const result = spawnSync(process.execPath, [path.join(ROOT, ".framework", "tools", "build-agents-config.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
    windowsHide: true,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

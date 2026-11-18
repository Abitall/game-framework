#!/usr/bin/env node
/**
 * Environment check: what is installed, what is missing, and what it costs.
 *
 * Reads the project to decide which engine is in play, then checks only the
 * things that engine actually needs. Changes nothing.
 *
 * Usage:
 *   node tools/envcheck.mjs [--json]
 *
 * Exit 0 when every REQUIRED item is present, 1 otherwise.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const json = process.argv.includes("--json")

const rows = []
const add = (name, level, ok, detail) => rows.push({ name, level, ok, detail })

function command(cmd, args = ["--version"]) {
  const line = `${cmd} ${args.join(" ")}`.trim()
  const result = spawnSync(line, { encoding: "utf8", shell: true, windowsHide: true, timeout: 15000 })
  if (result.status !== 0) return null
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n")[0]
}

function firstExisting(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null
}

// ── Runtime ──────────────────────────────────────────────────────────────────
const nodeVersion = process.versions.node
const nodeMajor = Number(nodeVersion.split(".")[0])
add("Node.js", "required", nodeMajor >= 18, `v${nodeVersion}${nodeMajor >= 18 ? "" : " — need >= 18"}`)

const npmVersion = command("npm")
add("npm", "required", Boolean(npmVersion), npmVersion ?? "not found")

const gitVersion = command("git")
add("git", "required", Boolean(gitVersion), gitVersion ?? "not found")

// ── Browser (capture, UI checks) ─────────────────────────────────────────────
const chrome = firstExisting([
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/microsoft-edge",
])
add("Chrome or Edge", "recommended", Boolean(chrome), chrome ?? "not found — capture and UI checks unavailable")

const docker = command("docker", ["--version"])
add("Docker", "optional", Boolean(docker), docker ?? "not found — local web search unavailable")

// ── Project ──────────────────────────────────────────────────────────────────
const pkgPath = path.join(ROOT, "package.json")
let pkg = null
if (fs.existsSync(pkgPath)) {
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  } catch {
    pkg = null
  }
}
add("package.json", "required", Boolean(pkg), pkg ? "ok" : "missing or invalid")

const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }
const hasDep = (name) => Boolean(deps[name]) && fs.existsSync(path.join(ROOT, "node_modules", name))

add("node_modules", "required", fs.existsSync(path.join(ROOT, "node_modules")), fs.existsSync(path.join(ROOT, "node_modules")) ? "installed" : 'run "npm install"')

// ── Engine ───────────────────────────────────────────────────────────────────
const engineRoot = path.join(ROOT, "docs", "engine-reference")
const engines = fs.existsSync(engineRoot)
  ? fs.readdirSync(engineRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : []

if (engines.length) {
  add("engine reference", "required", true, engines.join(", "))
} else {
  add("engine reference", "recommended", false, "docs/engine-reference is empty — run /setup-engine")
}

const isPhaser = engines.includes("phaser") || Boolean(deps.phaser)

// A fresh framework checkout has no game yet; engine dependencies only become
// required once there is code to build.
const srcDir = path.join(ROOT, "src")
const hasGameCode = fs.existsSync(srcDir) && fs
  .readdirSync(srcDir, { recursive: true })
  .some((entry) => /\.(ts|js|tsx|cs|gd|gml|cpp)$/i.test(String(entry)))
const hasGameConfig = fs.existsSync(path.join(ROOT, "vite.config.ts")) || fs.existsSync(path.join(ROOT, "vite.config.js"))
const isGameProject = hasGameCode || hasGameConfig
const engineLevel = isGameProject ? "required" : "optional"

if (isPhaser) {
  add("phaser", engineLevel, hasDep("phaser"), hasDep("phaser") ? deps.phaser : isGameProject ? 'missing — run "npm install phaser"' : "no game code yet")
  add("vite", engineLevel, hasDep("vite"), hasDep("vite") ? deps.vite : isGameProject ? 'missing — run "npm install -D vite"' : "no game code yet")
  add("typescript", engineLevel, hasDep("typescript"), hasDep("typescript") ? deps.typescript : isGameProject ? 'missing — run "npm install -D typescript"' : "no game code yet")
  add("tsconfig.json", engineLevel, fs.existsSync(path.join(ROOT, "tsconfig.json")), fs.existsSync(path.join(ROOT, "tsconfig.json")) ? "ok" : isGameProject ? "missing" : "no game code yet")
}

const isUnity = engines.includes("unity")
if (isUnity) {
  const unity = firstExisting([
    "C:/Program Files/Unity/Hub/Editor",
    "/Applications/Unity/Hub/Editor",
  ])
  add("Unity Hub editor", "recommended", Boolean(unity), unity ?? "not found — install Unity 6.3 LTS via Unity Hub")
}

// ── Project extras ───────────────────────────────────────────────────────────
add("dist-play snapshot", "optional", fs.existsSync(path.join(ROOT, "dist-play", ".published")), fs.existsSync(path.join(ROOT, "dist-play", ".published")) ? "published" : 'not published yet — "npm run publish:play"')
add("PIPELINE.md", "recommended", fs.existsSync(path.join(ROOT, "production", "PIPELINE.md")), "production/PIPELINE.md")
add("SCOPE.md", "recommended", fs.existsSync(path.join(ROOT, "production", "SCOPE.md")), "production/SCOPE.md")

// ── Report ───────────────────────────────────────────────────────────────────
const required = rows.filter((r) => r.level === "required")
const missingRequired = required.filter((r) => !r.ok)
const missingRecommended = rows.filter((r) => r.level === "recommended" && !r.ok)

if (json) {
  console.log(JSON.stringify({ rows, missingRequired: missingRequired.length, missingRecommended: missingRecommended.length }, null, 2))
} else {
  console.log("")
  console.log(`  Environment — ${path.basename(ROOT)}`)
  console.log("")
  const width = Math.max(...rows.map((r) => r.name.length))
  for (const r of rows) {
    const mark = r.ok ? "x" : r.level === "required" ? "!" : "·"
    console.log(`  ${mark} ${r.name.padEnd(width)}  ${r.level.padEnd(11)} ${r.detail}`)
  }
  console.log("")
  if (missingRequired.length) {
    console.log(`  ${missingRequired.length} required item(s) missing.`)
  } else {
    console.log("  All required items present.")
  }
  if (missingRecommended.length) {
    console.log(`  ${missingRecommended.length} recommended item(s) missing — not blocking.`)
  }
  console.log("")
}

process.exitCode = missingRequired.length ? 1 : 0

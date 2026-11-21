#!/usr/bin/env node
/**
 * Framework sync check.
 *
 * The pool (.framework/library) and the active tree (.opencode) are two copies of
 * the same files. When they disagree, the project silently runs old code: a bug
 * fixed in the pool keeps working in the project, and the fix looks like it did
 * nothing.
 *
 * This command compares them and says which files differ. It does not decide
 * which side is right:
 *
 *   - the pool is newer: a framework fix has not reached the project
 *       node .framework/install.mjs add <module> --force
 *   - the active copy is newer: the project edited a framework file
 *       node .framework/install.mjs capture <module>
 *
 * Exit code 1 when anything is out of sync.
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const LIBRARY = path.join(ROOT, ".framework", "library")
const ACTIVE = path.join(ROOT, ".opencode")

const KINDS = {
  agents: (name) => path.join("agents", `${name}.md`),
  skills: (name) => path.join("skills", name, "SKILL.md"),
  rules: (name) => path.join("rules", `${name}.md`),
  commands: (name) => path.join("commands", `${name}.md`),
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function entries(kind) {
  const dir = path.join(LIBRARY, kind)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      if (kind === "skills") return entry.isDirectory() ? entry.name : null
      return entry.isFile() && entry.name.endsWith(".md") ? entry.name.slice(0, -3) : null
    })
    .filter(Boolean)
}

/** Only installed modules matter: everything else is a pool item nobody loaded. */
function installedPaths() {
  const file = path.join(ACTIVE, "modules", "installed.json")
  if (!fs.existsSync(file)) return null
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  const paths = new Set()
  for (const name of Object.keys(data.modules ?? {})) {
    const manifestFile = path.join(ROOT, ".framework", "modules", `${name}.json`)
    if (!fs.existsSync(manifestFile)) continue
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    for (const [kind, toPath] of Object.entries(KINDS)) {
      for (const item of manifest[kind] ?? []) paths.add(toPath(item))
    }
  }
  return paths
}

const expected = installedPaths()
const missing = []
const differing = []
let checked = 0

for (const [kind, toPath] of Object.entries(KINDS)) {
  for (const name of entries(kind)) {
    const rel = toPath(name)
    if (expected && !expected.has(rel)) continue
    const from = path.join(LIBRARY, rel)
    const to = path.join(ACTIVE, rel)
    checked++
    if (!fs.existsSync(to)) {
      missing.push(rel)
      continue
    }
    if (digest(from) !== digest(to)) differing.push(rel)
  }
}

console.log("")
if (!missing.length && !differing.length) {
  console.log(`  Framework sync: OK — ${checked} files, the pool and the active tree match`)
  console.log("")
  process.exit(0)
}

console.log(`  Framework sync: ${missing.length} missing, ${differing.length} differ (checked ${checked})`)
if (missing.length) {
  console.log("  Missing in .opencode (the file exists in the pool but is not loaded):")
  for (const file of missing) console.log(`    ${file}`)
}
if (differing.length) {
  console.log("  Differ (one side was changed after the other was written):")
  for (const file of differing) console.log(`    ${file}`)
}
console.log("")
console.log("  If the pool is right:      node .framework/install.mjs add <module> --force")
console.log("  If the active copy is right: node .framework/install.mjs capture <module>")
console.log("  Unsure which:              git log --oneline -- .framework/library/<file>")
console.log("")
process.exit(1)

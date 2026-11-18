#!/usr/bin/env node
/**
 * Framework module installer.
 *
 * Architecture:
 *   .framework/library/    pool with every tool. Never read by the agent.
 *   .framework/modules/    module manifests (what belongs where, and when).
 *   .opencode/             active content. Only installed modules exist here.
 *
 * Usage:
 *   node .framework/install.mjs list
 *   node .framework/install.mjs info <module>
 *   node .framework/install.mjs add <module...> [--force]
 *   node .framework/install.mjs remove <module...>
 *   node .framework/install.mjs capture <module>      push edits back to the pool
 *   node .framework/install.mjs status
 *   node .framework/install.mjs doctor
 */
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const LIB = path.join(ROOT, ".framework", "library")
const MODS = path.join(ROOT, ".framework", "modules")
const ACTIVE = path.join(ROOT, ".opencode")
const STATE = path.join(ACTIVE, "modules", "installed.json")

const KINDS = ["agents", "skills", "commands", "rules"]
const DOCS = path.join(ROOT, "docs")

/** Docs live outside `.opencode`, next to the project. */
function destFor(rel) {
  const normalized = rel.split(path.sep).join("/")
  return normalized.startsWith("docs/") ? path.join(ROOT, normalized) : path.join(ACTIVE, rel)
}

// ── helpers ────────────────────────────────────────────────────────────────

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex")
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

function readManifests() {
  if (!fs.existsSync(MODS)) return new Map()
  const map = new Map()
  for (const file of fs.readdirSync(MODS)) {
    if (!file.endsWith(".json")) continue
    const manifest = readJSON(path.join(MODS, file), null)
    if (manifest?.name) map.set(manifest.name, manifest)
  }
  return map
}

function readState() {
  const state = readJSON(STATE, null)
  if (state?.version === 2 && state.modules) return state
  // Migrate or start fresh; the old v1 journal is not used for anything.
  return { version: 2, modules: {} }
}

function saveState(state) {
  writeJSON(STATE, state)
}

/** Expand a module to itself plus dependencies, dependencies first. */
function withDeps(name, manifests, seen = new Set(), chain = []) {
  if (seen.has(name)) return []
  const manifest = manifests.get(name)
  if (!manifest) throw new Error(`unknown module: ${name}`)
  if (chain.includes(name)) throw new Error(`dependency cycle: ${[...chain, name].join(" -> ")}`)
  const out = []
  for (const dep of manifest.depends ?? []) {
    out.push(...withDeps(dep, manifests, seen, [...chain, name]))
  }
  if (!seen.has(name)) {
    seen.add(name)
    out.push(name)
  }
  return out
}

/** Resolve a manifest to concrete source → destination file pairs. */
function resolveFiles(manifest) {
  const pairs = []

  for (const agent of manifest.agents ?? []) {
    const rel = path.join("agents", `${agent}.md`)
    pairs.push({ rel, src: path.join(LIB, rel), dest: path.join(ACTIVE, rel) })
  }

  for (const skill of manifest.skills ?? []) {
    const dir = path.join(LIB, "skills", skill)
    if (!fs.existsSync(dir)) continue
    for (const file of walk(dir)) {
      const rel = path.relative(LIB, file)
      pairs.push({ rel, src: file, dest: path.join(ACTIVE, rel) })
    }
  }

  for (const command of manifest.commands ?? []) {
    const rel = path.join("commands", `${command}.md`)
    pairs.push({ rel, src: path.join(LIB, rel), dest: path.join(ACTIVE, rel) })
  }

  for (const rule of manifest.rules ?? []) {
    const rel = path.join("rules", `${rule}.md`)
    pairs.push({ rel, src: path.join(LIB, rel), dest: path.join(ACTIVE, rel) })
  }

  for (const doc of manifest.docs ?? []) {
    const rel = path.join("docs", doc)
    pairs.push({ rel, src: path.join(LIB, "docs", doc), dest: path.join(ROOT, rel) })
  }

  return pairs
}

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function pruneEmptyDirs(file) {
  let dir = path.dirname(file)
  while (dir.startsWith(ROOT) && dir !== ROOT) {
    if (dir === ACTIVE || dir === DOCS) break
    try {
      if (fs.readdirSync(dir).length > 0) break
      fs.rmdirSync(dir)
    } catch {
      break
    }
    dir = path.dirname(dir)
  }
}

// ── commands ───────────────────────────────────────────────────────────────

function cmdList() {
  const manifests = readManifests()
  const state = readState()
  const rows = [...manifests.values()].sort((a, b) => {
    if (a.default !== b.default) return a.default ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const pad = (s, n) => String(s).padEnd(n)
  console.log("")
  console.log(`  ${pad("MODULE", 22)}${pad("STATUS", 12)}${pad("DEFAULT", 9)}CONTENTS`)
  console.log(`  ${"-".repeat(70)}`)
  for (const m of rows) {
    const status = state.modules[m.name] ? "installed" : "available"
    const contents = [
      m.agents?.length ? `${m.agents.length} agents` : "",
      m.skills?.length ? `${m.skills.length} skills` : "",
      m.rules?.length ? `${m.rules.length} rules` : "",
    ].filter(Boolean).join(", ")
    console.log(`  ${pad(m.name, 22)}${pad(status, 12)}${pad(m.default ? "yes" : "-", 9)}${contents}`)
  }

  const installed = Object.keys(state.modules).length
  const activeFiles = KINDS.reduce(
    (sum, kind) => sum + (fs.existsSync(path.join(ACTIVE, kind)) ? walk(path.join(ACTIVE, kind)).length : 0),
    0,
  )
  console.log("")
  console.log(`  Installed: ${installed}/${rows.length} modules, ${activeFiles} active files`)
  console.log(`  Install one: node .framework/install.mjs add <module>`)
  console.log("")
}

function cmdInfo(name) {
  const manifests = readManifests()
  const manifest = manifests.get(name)
  if (!manifest) throw new Error(`unknown module: ${name}`)
  const state = readState()
  console.log("")
  console.log(`  ${manifest.name} v${manifest.version}  (${state.modules[name] ? "installed" : "available"})`)
  console.log(`  ${manifest.description}`)
  console.log("")
  if (manifest.depends.length) console.log(`  depends on: ${manifest.depends.join(", ")}`)
  console.log(`  install when: ${manifest.triggers.join("; ")}`)
  for (const kind of KINDS) {
    const list = manifest[kind] ?? []
    if (list.length) console.log(`  ${kind} (${list.length}): ${list.join(", ")}`)
  }
  console.log("")
}

function cmdAdd(args) {
  const force = args.includes("--force")
  const names = args.filter((a) => !a.startsWith("--"))
  if (!names.length) throw new Error("usage: add <module...> [--force]")

  const manifests = readManifests()
  const state = readState()
  const targets = []
  const seen = new Set()
  for (const name of names) targets.push(...withDeps(name, manifests, seen))
  const fresh = targets.filter((name) => !state.modules[name])
  const already = targets.filter((name) => state.modules[name])

  let copied = 0
  let skipped = 0
  const conflicts = []

  for (const name of targets) {
    const manifest = manifests.get(name)
    const record = state.modules[name] ?? { version: manifest.version, installedAt: new Date().toISOString(), files: {} }
    const files = resolveFiles(manifest)

    for (const { rel, src, dest } of files) {
      if (!fs.existsSync(src)) {
        console.warn(`  ! missing in pool: ${rel}`)
        continue
      }
      const source = fs.readFileSync(src)
      if (fs.existsSync(dest)) {
        const current = fs.readFileSync(dest)
        if (sha256(current) === sha256(source)) {
          record.files[rel] = sha256(source)
          skipped++
          continue
        }
        if (!force) {
          conflicts.push(rel)
          continue
        }
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, source)
      record.files[rel] = sha256(source)
      copied++
    }

    record.version = manifest.version
    state.modules[name] = record
  }

  saveState(state)
  console.log(`  Added ${fresh.length} module(s): ${fresh.length ? fresh.join(", ") : "(none)"}`)
  if (already.length) console.log(`  Already installed: ${already.join(", ")}`)
  console.log(`  Files copied: ${copied}, unchanged: ${skipped}, skipped: ${conflicts.length}`)
  if (conflicts.length) {
    console.log(`  Skipped because the active file differs from the pool (use --force to overwrite):`)
    for (const rel of conflicts) console.log(`    - ${rel}`)
  }
}

function cmdRemove(args) {
  const names = args.filter((a) => !a.startsWith("--"))
  if (!names.length) throw new Error("usage: remove <module...>")
  const manifests = readManifests()
  const state = readState()

  let removed = 0
  const kept = []

  for (const name of names) {
    const record = state.modules[name]
    if (!record) {
      console.log(`  ${name}: not installed, nothing to do`)
      continue
    }
    for (const [rel, hash] of Object.entries(record.files)) {
      const dest = destFor(rel)
      if (!fs.existsSync(dest)) continue
      const current = fs.readFileSync(dest)
      if (sha256(current) !== hash) {
        kept.push(rel)
        continue
      }
      fs.rmSync(dest)
      pruneEmptyDirs(dest)
      removed++
    }
    delete state.modules[name]
  }

  saveState(state)
  console.log(`  Removed ${removed} file(s)`)
  if (kept.length) {
    console.log(`  Kept ${kept.length} modified file(s) — review and delete manually if not needed:`)
    for (const rel of kept) console.log(`    - ${rel}`)
  }
}

function cmdCapture(args) {
  const names = args.filter((a) => !a.startsWith("--"))
  if (!names.length) throw new Error("usage: capture <module>")
  const manifests = readManifests()
  let copied = 0
  let missing = 0

  for (const name of names) {
    const manifest = manifests.get(name)
    if (!manifest) throw new Error(`unknown module: ${name}`)
    for (const { rel, src, dest } of resolveFiles(manifest)) {
      if (!fs.existsSync(dest)) {
        missing++
        continue
      }
      const next = fs.readFileSync(dest)
      if (fs.existsSync(src) && sha256(fs.readFileSync(src)) === sha256(next)) continue
      fs.mkdirSync(path.dirname(src), { recursive: true })
      fs.writeFileSync(src, next)
      copied++
    }
  }

  console.log(`  Captured ${copied} changed file(s) into the pool`)
  if (missing) console.log(`  ${missing} file(s) not present in the active tree`)
}

function cmdStatus() {
  const state = readState()
  const names = Object.keys(state.modules)
  console.log("")
  if (!names.length) {
    console.log("  No modules installed.")
  } else {
    console.log(`  Installed modules (${names.length}): ${names.sort().join(", ")}`)
  }
  for (const kind of KINDS) {
    const dir = path.join(ACTIVE, kind)
    const count = fs.existsSync(dir) ? walk(dir).length : 0
    console.log(`  ${kind.padEnd(10)} ${count} active file(s)`)
  }
  console.log("")
}

function cmdDoctor() {
  const issues = []

  // Legacy broken symlinks checked out as plain files on Windows.
  for (const kind of KINDS) {
    const dir = path.join(ACTIVE, kind)
    if (!fs.existsSync(dir)) continue
    const stat = fs.statSync(dir)
    if (!stat.isDirectory()) {
      issues.push(`${kind} is a file, not a directory (broken symlink): ${fs.readFileSync(dir, "utf8").trim()}`)
    }
  }

  // Active files that belong to no installed module.
  const state = readState()
  const known = new Set()
  for (const record of Object.values(state.modules)) {
    for (const rel of Object.keys(record.files)) known.add(rel)
  }
  for (const kind of KINDS) {
    const dir = path.join(ACTIVE, kind)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue
    for (const file of walk(dir)) {
      const rel = path.relative(ACTIVE, file)
      if (!known.has(rel)) issues.push(`orphan active file: ${rel}`)
    }
  }

  // Pool files that no module claims.
  const manifests = readManifests()
  const claimed = new Set()
  for (const m of manifests.values()) {
    for (const a of m.agents) claimed.add(path.join("agents", `${a}.md`))
    for (const s of m.skills) claimed.add(path.join("skills", s, "SKILL.md"))
    for (const r of m.rules) claimed.add(path.join("rules", `${r}.md`))
    for (const d of m.docs ?? []) claimed.add(path.join("docs", d))
  }
  for (const kind of ["agents", "rules"]) {
    const dir = path.join(LIB, kind)
    if (!fs.existsSync(dir)) continue
    for (const file of walk(dir)) {
      const rel = path.relative(LIB, file)
      if (!claimed.has(rel)) issues.push(`unclaimed pool file: ${rel}`)
    }
  }
  const docsPool = path.join(LIB, "docs")
  if (fs.existsSync(docsPool)) {
    for (const file of walk(docsPool)) {
      const rel = path.relative(LIB, file)
      if (!claimed.has(rel)) issues.push(`unclaimed pool file: ${rel}`)
    }
  }

  console.log("")
  if (!issues.length) {
    console.log("  Doctor: OK — active tree matches installed modules.")
  } else {
    console.log(`  Doctor: ${issues.length} issue(s)`)
    for (const issue of issues) console.log(`    - ${issue}`)
    process.exitCode = 1
  }
  console.log("")
}

// ── main ───────────────────────────────────────────────────────────────────

const [command = "list", ...args] = process.argv.slice(2)

try {
  switch (command) {
    case "list": cmdList(); break
    case "info": cmdInfo(args[0]); break
    case "add": cmdAdd(args); break
    case "remove": cmdRemove(args); break
    case "capture": cmdCapture(args); break
    case "status": cmdStatus(); break
    case "doctor": cmdDoctor(); break
    case "-h":
    case "--help":
    case "help":
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^.*?\/\*\*/s, ""))
      break
    default:
      throw new Error(`unknown command: ${command}`)
  }
} catch (error) {
  console.error(`  error: ${error.message}`)
  process.exitCode = 1
}

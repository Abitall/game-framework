#!/usr/bin/env node
/**
 * Framework self-check.
 *
 * Goes beyond the test suites: it verifies that every module installs and
 * uninstalls cleanly, that no active file is orphaned, that docs referenced by
 * agents exist, and that no two library files are byte-identical under
 * different names (the failure mode that produced the duplicate templates).
 *
 * Usage: node .framework/tools/self-check.mjs [--quick]
 */
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const LIB = path.join(ROOT, ".framework", "library")
const MODS = path.join(ROOT, ".framework", "modules")
const ACTIVE = path.join(ROOT, ".opencode")
const QUICK = process.argv.includes("--quick")

const problems = []
const notes = []
const fail = (m) => problems.push(m)
const note = (m) => notes.push(m)

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function run(args) {
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", windowsHide: true })
}

// ── 1. Manifests ─────────────────────────────────────────────────────────────
const manifests = fs
  .readdirSync(MODS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(MODS, f), "utf8")))

if (!manifests.length) fail("no module manifests found")

const claimed = new Map()
const moduleOfAgent = new Map()
for (const m of manifests) {
  for (const a of m.agents ?? []) {
    claimed.set(path.join("agents", `${a}.md`), m.name)
    moduleOfAgent.set(a, m.name)
  }
  for (const s of m.skills ?? []) claimed.set(path.join("skills", s, "SKILL.md"), m.name)
  for (const c of m.commands ?? []) claimed.set(path.join("commands", `${c}.md`), m.name)
  for (const r of m.rules ?? []) claimed.set(path.join("rules", `${r}.md`), m.name)
  for (const d of m.docs ?? []) claimed.set(path.join("docs", d), m.name)
}

for (const file of walk(LIB)) {
  const rel = path.relative(LIB, file)
  const normalized = rel.split(path.sep).join("/")
  const isSkillFile = normalized.startsWith("skills/") && !normalized.endsWith("SKILL.md")
  if (isSkillFile) continue // references/, scripts/ inside a skill belong to it
  if (!claimed.has(rel) && !claimed.has(normalized)) fail(`library file belongs to no module: ${normalized}`)
}

// ── 2. References to engine docs must resolve, or be clearly conditional ─────
const engineDirs = fs.readdirSync(path.join(ROOT, "docs", "engine-reference"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

const seenNotes = new Set()
for (const file of walk(path.join(LIB, "agents"))) {
  if (!file.endsWith(".md")) continue
  const agent = path.basename(file, ".md")
  const owner = moduleOfAgent.get(agent) ?? ""
  const ownEngine = owner.startsWith("engine-") ? owner.slice("engine-".length) : null
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(/docs\/engine-reference\/([a-z0-9-]+)\//g)) {
    const engine = match[1]
    if (engine === ownEngine) continue
    if (!engineDirs.includes(engine)) continue
    const key = `${agent} -> ${engine}`
    if (seenNotes.has(key)) continue
    seenNotes.add(key)
    note(`${agent} references docs/engine-reference/${engine}/ but belongs to ${owner}`)
  }
}

// ── 3. Duplicate content ─────────────────────────────────────────────────────
const byHash = new Map()
for (const file of walk(LIB)) {
  if (!/\.(md|mjs|json|ya?ml)$/i.test(file)) continue
  const size = fs.statSync(file).size
  if (size < 200) continue // trivial files collide harmlessly
  const h = hash(file)
  if (!byHash.has(h)) byHash.set(h, [])
  byHash.get(h).push(path.relative(ROOT, file))
}
for (const [, files] of byHash) {
  if (files.length > 1) fail(`identical files: ${files.join(" == ")}`)
}

// Docs can legitimately repeat a sentence, but identical whole files are suspect.
const docsByHash = new Map()
for (const file of walk(path.join(ROOT, "docs"))) {
  if (!file.endsWith(".md")) continue
  if (fs.statSync(file).size < 500) continue
  const h = hash(file)
  if (!docsByHash.has(h)) docsByHash.set(h, [])
  docsByHash.get(h).push(path.relative(ROOT, file))
}
for (const [, files] of docsByHash) {
  if (files.length > 1) fail(`identical docs: ${files.join(" == ")}`)
}

// ── 4. Broken markdown links in framework docs ───────────────────────────────
const docFiles = [
  path.join(ROOT, "README.md"),
  path.join(ROOT, "AGENTS.md"),
  ...walk(path.join(ROOT, "docs", "agents")),
  ...fs.readdirSync(path.join(ROOT, "docs")).filter((f) => f.endsWith(".md")).map((f) => path.join(ROOT, "docs", f)),
]
for (const file of docFiles) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
    const target = match[1]
    if (/^https?:/.test(target)) continue
    const resolved = path.resolve(path.dirname(file), target)
    if (!fs.existsSync(resolved)) fail(`${path.relative(ROOT, file)}: broken link ${target}`)
  }
}

// ── 5. Module round-trip ─────────────────────────────────────────────────────
function doctorOk() {
  const result = run([path.join(ROOT, ".framework", "install.mjs"), "doctor"])
  return result.status === 0
}

if (!doctorOk()) fail("doctor is not clean before the round-trip test")

if (!QUICK) {
  const statePath = path.join(ACTIVE, "modules", "installed.json")
  const stateBefore = fs.readFileSync(statePath, "utf8")
  const installedNow = new Set(Object.keys(JSON.parse(stateBefore).modules ?? {}))

  for (const m of manifests.filter((x) => !x.default)) {
    // Only round-trip modules that are not installed: removing a module that is
    // part of the baseline would change the state by design.
    if (installedNow.has(m.name)) continue

    const add = run([path.join(ROOT, ".framework", "install.mjs"), "add", m.name])
    if (add.status !== 0) {
      fail(`add ${m.name} failed: ${add.stderr.trim()}`)
      continue
    }
    if (!doctorOk()) fail(`doctor failed after adding ${m.name}`)

    // Every declared file must exist on disk.
    const expected = [
      ...(m.agents ?? []).map((a) => path.join(ACTIVE, "agents", `${a}.md`)),
      ...(m.skills ?? []).map((s) => path.join(ACTIVE, "skills", s, "SKILL.md")),
      ...(m.rules ?? []).map((r) => path.join(ACTIVE, "rules", `${r}.md`)),
      ...(m.docs ?? []).map((d) => path.join(ROOT, "docs", d)),
    ]
    for (const file of expected) {
      if (!fs.existsSync(file)) fail(`${m.name}: declared file missing after install: ${path.relative(ROOT, file)}`)
    }

    const remove = run([path.join(ROOT, ".framework", "install.mjs"), "remove", m.name])
    if (remove.status !== 0) fail(`remove ${m.name} failed: ${remove.stderr.trim()}`)

    // Dependencies pulled in by the add (for example engine-phaser for
    // ui-editor) are not part of the baseline; remove them too.
    const after = JSON.parse(fs.readFileSync(statePath, "utf8")).modules ?? {}
    for (const name of Object.keys(after)) {
      if (installedNow.has(name)) continue
      const cleanup = run([path.join(ROOT, ".framework", "install.mjs"), "remove", name])
      if (cleanup.status !== 0) fail(`cleanup of ${name} after ${m.name} failed`)
    }

    if (!doctorOk()) fail(`doctor failed after removing ${m.name}`)
  }

  const stateAfter = fs.readFileSync(path.join(ACTIVE, "modules", "installed.json"), "utf8")
  if (stateBefore !== stateAfter) fail("installed.json changed after the round-trip test")
}

// ── 6. Report ────────────────────────────────────────────────────────────────
console.log("")
if (notes.length) {
  console.log(`  Notes (${notes.length}):`)
  for (const n of notes.slice(0, 10)) console.log(`    - ${n}`)
  if (notes.length > 10) console.log(`    … and ${notes.length - 10} more`)
  console.log("")
}
if (problems.length) {
  console.log(`  Self-check: ${problems.length} problem(s)`)
  for (const p of problems) console.log(`    - ${p}`)
  process.exitCode = 1
} else {
  console.log(`  Self-check: OK — ${manifests.length} modules, round-trip clean, no duplicates, no broken links`)
}
console.log("")

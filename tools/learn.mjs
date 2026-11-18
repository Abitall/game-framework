#!/usr/bin/env node
/**
 * Learning loop: findings become proposals, the user accepts or rejects them.
 * Accepted findings land in `docs/solutions/<sphere>.md`. A finding marked
 * `--global` is also appended to `.framework/global-solutions.md`, which travels
 * with the framework into the next project.
 *
 * The framework's own rules and skills are never edited here. Promotion to a rule
 * is a separate, explicit step (`promote` prints how).
 *
 * Usage:
 *   node tools/learn.mjs propose --title "..." --sphere code --what "..." --why "..."
 *                                [--when "..."] [--source "..."] [--global]
 *   node tools/learn.mjs list
 *   node tools/learn.mjs accept <slug>
 *   node tools/learn.mjs reject <slug> --why "..."
 *   node tools/learn.mjs promote <slug>
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PENDING = path.join(ROOT, "production", "proposals")
const ACCEPTED = path.join(PENDING, "accepted")
const REJECTED = path.join(PENDING, "rejected")
const SOLUTIONS = path.join(ROOT, "docs", "solutions")
const GLOBAL = path.join(ROOT, ".framework", "global-solutions.md")

const SPHERES = ["code", "gameplay", "ui", "tests", "art", "process", "tools"]

const args = process.argv.slice(2)
const command = args[0] ?? "list"

function flag(name, fallback = "") {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] ?? fallback : fallback
}
function has(name) {
  return args.includes(`--${name}`)
}
function positional(index) {
  const values = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"))
  return values[index] ?? ""
}
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

function readProposal(file) {
  const text = fs.readFileSync(file, "utf8")
  const field = (name) => text.match(new RegExp(`^- \\*\\*${name}:\\*\\* (.*)$`, "m"))?.[1]?.trim() ?? ""
  return {
    file,
    title: field("Title"),
    sphere: field("Sphere") || "process",
    scope: field("Scope") || "project",
    what: field("Worked"),
    why: field("Why"),
    when: field("When"),
    source: field("Source"),
  }
}

function cmdPropose() {
  const title = flag("title")
  const what = flag("what")
  const why = flag("why")
  const sphere = flag("sphere", "process")
  if (!title || !what || !why) {
    throw new Error('propose needs --title, --what and --why')
  }
  if (!SPHERES.includes(sphere)) {
    throw new Error(`unknown sphere "${sphere}". Use: ${SPHERES.join(", ")}`)
  }
  fs.mkdirSync(PENDING, { recursive: true })
  const slug = `${today()}-${slugify(title)}`
  const file = path.join(PENDING, `${slug}.md`)
  if (fs.existsSync(file)) throw new Error(`proposal already exists: ${slug}`)

  const body = [
    `# ${title}`,
    "",
    `- **Title:** ${title}`,
    `- **Sphere:** ${sphere}`,
    `- **Scope:** ${has("global") ? "global" : "project"}`,
    `- **Date:** ${today()}`,
    `- **Worked:** ${what}`,
    `- **Why:** ${why}`,
    `- **When:** ${flag("when", "when the same situation appears again")}`,
    `- **Source:** ${flag("source", "session")}`,
    "",
    "## Decision",
    "",
    "_Pending. Accept with `node tools/learn.mjs accept " + slug + "`._",
    "",
  ].join("\n")

  fs.writeFileSync(file, body, "utf8")
  console.log(`  proposed: production/proposals/${slug}.md`)
  console.log("  Nothing is applied until you accept it.")
}

function cmdList() {
  if (!fs.existsSync(PENDING)) {
    console.log("  No proposals.")
    return
  }
  const files = fs.readdirSync(PENDING).filter((f) => f.endsWith(".md")).sort()
  if (!files.length) {
    console.log("  No pending proposals.")
    return
  }
  console.log("")
  for (const file of files) {
    const p = readProposal(path.join(PENDING, file))
    console.log(`  ${file.replace(/\.md$/, "")}`)
    console.log(`    ${p.title}  [${p.sphere}/${p.scope}]`)
  }
  console.log("")
}

function findProposal(slug) {
  if (!fs.existsSync(PENDING)) throw new Error("no proposals directory")
  const match = fs.readdirSync(PENDING).find((f) => f.endsWith(".md") && f.includes(slug))
  if (!match) throw new Error(`no proposal matches "${slug}"`)
  return path.join(PENDING, match)
}

function entryFor(proposal) {
  return [
    `## ${today()} — ${proposal.title}`,
    "",
    `**Problem:** ${proposal.when || "the situation this solves"}`,
    `**Worked:** ${proposal.what}`,
    `**Why:** ${proposal.why}`,
    `**Reuse:** ${proposal.when || "when the same situation appears again"}`,
    `**Source:** ${proposal.source || "session"}`,
    "",
  ].join("\n")
}

function cmdAccept() {
  const file = findProposal(positional(0))
  const proposal = readProposal(file)
  fs.mkdirSync(SOLUTIONS, { recursive: true })
  const target = path.join(SOLUTIONS, `${proposal.sphere}.md`)
  const header = fs.existsSync(target)
    ? ""
    : `# Solutions — ${proposal.sphere[0].toUpperCase()}${proposal.sphere.slice(1)}\n\nNewest first.\n\n`
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : header
  // Insert newest first, after the file preamble.
  const lines = current.split(/\r?\n/)
  const firstEntry = lines.findIndex((l) => l.startsWith("## "))
  const insertAt = firstEntry === -1 ? lines.length : firstEntry
  const next = [...lines.slice(0, insertAt), entryFor(proposal), ...lines.slice(insertAt)].join("\n")
  fs.writeFileSync(target, next.replace(/\n{3,}/g, "\n\n"), "utf8")

  if (proposal.scope === "global") {
    const head = fs.existsSync(GLOBAL)
      ? ""
      : "# Global solutions\n\nRules and techniques that should travel into every new project.\n\n"
    fs.writeFileSync(GLOBAL, head + entryFor(proposal) + (fs.existsSync(GLOBAL) ? fs.readFileSync(GLOBAL, "utf8").split(/\r?\n/).slice(4).join("\n") : ""), "utf8")
    console.log("  also written to .framework/global-solutions.md")
  }

  fs.mkdirSync(ACCEPTED, { recursive: true })
  fs.renameSync(file, path.join(ACCEPTED, path.basename(file)))
  console.log(`  accepted: docs/solutions/${proposal.sphere}.md`)
}

function cmdReject() {
  const file = findProposal(positional(0))
  const why = flag("why", "no reason given")
  fs.mkdirSync(REJECTED, { recursive: true })
  const target = path.join(REJECTED, path.basename(file))
  fs.appendFileSync(file, `\n## Rejected\n\n${why}\n`, "utf8")
  fs.renameSync(file, target)
  console.log(`  rejected: ${path.basename(target)}`)
}

function cmdPromote() {
  const file = findProposal(positional(0))
  const proposal = readProposal(file)
  console.log("")
  console.log("  To make this a rule, edit the framework pool, not the active tree:")
  console.log("")
  console.log(`    .framework/library/rules/<rule>.md`)
  console.log("")
  console.log("  Add a line under the relevant section:")
  console.log(`    - ${proposal.what}`)
  console.log("")
  console.log("  Then rebuild and reinstall:")
  console.log("    node .framework/tools/build-manifests.mjs")
  console.log("    node .framework/install.mjs add <module> --force")
  console.log("")
  console.log("  Rules are global by design; project-specific findings stay in docs/solutions/.")
}

try {
  switch (command) {
    case "propose": cmdPropose(); break
    case "list": cmdList(); break
    case "accept": cmdAccept(); break
    case "reject": cmdReject(); break
    case "promote": cmdPromote(); break
    default: throw new Error(`unknown command: ${command}`)
  }
} catch (error) {
  console.error(`  error: ${error.message}`)
  process.exitCode = 2
}

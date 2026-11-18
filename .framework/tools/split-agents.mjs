import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SRC = path.join(ROOT, "AGENTS.md")
const OUT = path.join(ROOT, "docs", "agents")

const MAP = {
  "Technology Stack": "stack",
  "Project Structure": "structure",
  "Module System": "modules",
  "Coordination Rules": "coordination",
  "Studio Hierarchy": "hierarchy",
  "Collaboration Protocol": "collaboration",
  "Coding Standards": "coding",
  "Context Management": "context",
  "Workflow Modes": "workflow",
  "Getting Started": "getting-started",
  "Quality Gates": "quality",
  "Notes": "notes",
  "Engine Version Reference": "engine-reference",
}

const text = fs.readFileSync(SRC, "utf8")
const lines = text.split(/\r?\n/)

// Collect sections by "## " headings.
const sections = []
let current = null
for (const line of lines) {
  const heading = line.match(/^##\s+(.+?)\s*$/)
  if (heading) {
    current = { title: heading[1], lines: [] }
    sections.push(current)
  } else if (current) {
    current.lines.push(line)
  }
}

fs.mkdirSync(OUT, { recursive: true })

const written = []
const unknown = []
for (const section of sections) {
  const slug = MAP[section.title]
  if (!slug) {
    unknown.push(section.title)
    continue
  }
  const body = section.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  const content = `# ${section.title}\n\n${body}\n`
  fs.writeFileSync(path.join(OUT, `${slug}.md`), content, "utf8")
  written.push({ title: section.title, file: `docs/agents/${slug}.md`, chars: content.length })
}

const index = written
  .map((w) => `- [${w.title}](${w.file})`)
  .join("\n")

const instructions = written
  .map((w) => `"${w.file}"`)
  .join(",\n    ")

const newAgents = `# Game Framework

Indie game development framework for OpenCode. Module-driven successor to
OpenCode Game Studios, built for solo and small-team Phaser and Unity projects.

The full configuration lives in \`docs/agents/\` and is loaded through the
\`instructions\` field in \`opencode.json\`. This file keeps only the rules that
must survive even if that loading fails.

## Non-negotiables

- **Ask before writing.** No Write/Edit without "May I write this to [path]?".
- **Ask when the task is ambiguous.** Unless the user said "do it yourself".
- **Never install a module silently.** Propose, show the command, wait.
- **Never touch the playtest host** (port 5173, \`dist-play/\`) without a request.
- **Gameplay values are data-driven.** No hardcoded numbers in systems.
- **\`src/systems/**\` stays engine-agnostic.** No Phaser imports.
- **Run \`npm run check:encoding\`** after bulk text edits.
- **No commits without instruction.**

## Configuration index

${index}

## Structure at a glance

\`\`\`text
.framework/    pool: 52 agents, 84 skills, 16 rules, 29 templates, 28 modules
.opencode/     active: only installed modules
docs/agents/   this configuration, one file per topic
docs/          framework docs, engine references, solutions, examples
design/        GDDs and entity registry
src/           game code
production/    sprints, project stage, session state
\`\`\`

## Module quick reference

\`\`\`bash
node .framework/install.mjs list
node .framework/install.mjs add <module>
node .framework/install.mjs doctor
\`\`\`
`

fs.writeFileSync(SRC, newAgents, "utf8")

console.log(`Split ${written.length} sections into docs/agents/`)
console.log(`Unknown sections: ${unknown.length ? unknown.join(", ") : "none"}`)
console.log(`AGENTS.md: ${text.length} -> ${newAgents.length} chars`)
console.log(`\nAdd to opencode.json:\n"instructions": [\n    ${instructions}\n]`)

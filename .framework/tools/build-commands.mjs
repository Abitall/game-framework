/**
 * Generates one slash command per skill.
 *
 * Why generated: the previous files carried `skill:` and `category:` frontmatter,
 * which OpenCode does not read, and a body of "Invokes `/x` skill." — a prompt
 * that invokes nothing. A command body IS the prompt, so it must say what to do.
 *
 * Run: node .framework/tools/build-commands.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const SKILLS = path.join(ROOT, ".framework", "library", "skills")
const COMMANDS = path.join(ROOT, ".framework", "library", "commands")

function descriptionOf(skillDir) {
  const file = path.join(skillDir, "SKILL.md")
  if (!fs.existsSync(file)) return null
  const text = fs.readFileSync(file, "utf8")
  const match = text.match(/^description:\s*(.+)$/m)
  if (!match) return null
  let value = match[1].trim().replace(/^["']|["']$/g, "")
  // Command descriptions are menu labels. Keep them short: a long description
  // costs standing context for every command in every session.
  if (value.length > 60) {
    const cut = value.slice(0, 60)
    const space = cut.lastIndexOf(" ")
    value = `${cut.slice(0, space > 30 ? space : 60)}`
  }
  return value.replace(/"/g, '\\"')
}

fs.mkdirSync(COMMANDS, { recursive: true })

// Remove generated commands; keep README and anything not matching a skill.
const skills = fs
  .readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

for (const file of fs.readdirSync(COMMANDS)) {
  if (file === "README.md") continue
  if (!file.endsWith(".md")) continue
  const name = file.slice(0, -3)
  if (skills.includes(name)) fs.rmSync(path.join(COMMANDS, file))
}

let written = 0
for (const skill of skills) {
  const description = descriptionOf(path.join(SKILLS, skill))
  if (!description) {
    console.warn(`  skip ${skill}: no description`)
    continue
  }
  const body = [
    "---",
    `description: "${description}"`,
    "---",
    "",
    "Use the `" + skill + "` skill (`.opencode/skills/" + skill + "/SKILL.md`).",
    "",
    "$ARGUMENTS",
    "",
  ].join("\n")
  fs.writeFileSync(path.join(COMMANDS, `${skill}.md`), body, "utf8")
  written++
}

console.log(`Commands: ${written} generated from skills`)

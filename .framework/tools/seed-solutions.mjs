import fs from "node:fs"

const spheres = {
  code: "TypeScript, Phaser, architecture patterns",
  gameplay: "mechanics, balance, difficulty, feel",
  ui: "layout, scaling, accessibility, input",
  tests: "determinism, fixtures, harnesses",
  art: "code-drawn graphics, palettes, animation",
  process: "how the project is run, what saved time",
  tools: "custom scripts and how they work",
}

fs.mkdirSync("docs/solutions", { recursive: true })
for (const [key, summary] of Object.entries(spheres)) {
  const title = key[0].toUpperCase() + key.slice(1)
  const body = [
    `# Solutions — ${title}`,
    "",
    summary,
    "",
    "Newest first. Format: see `.framework/library/rules/solutions.md`.",
    "",
  ].join("\n")
  fs.writeFileSync(`docs/solutions/${key}.md`, body, "utf8")
}
console.log(`Wrote ${Object.keys(spheres).length} sphere files`)

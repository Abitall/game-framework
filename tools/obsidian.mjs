#!/usr/bin/env node
/**
 * Obsidian vault helper.
 *
 * The vault is a plain folder of markdown, so no plugin or server is needed:
 * notes are written as .md with frontmatter and [[wikilinks]], and Obsidian
 * indexes them on its own.
 *
 * Usage:
 *   node tools/obsidian.mjs vault
 *   node tools/obsidian.mjs init
 *   node tools/obsidian.mjs search "<query>"
 *   node tools/obsidian.mjs new <type> "<title>"
 *   node tools/obsidian.mjs check
 *   node tools/obsidian.mjs index
 *
 * Vault resolution order: --vault <path>, OBSIDIAN_VAULT, production/obsidian.json.
 */
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const flag = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const positional = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"))

const ROOT = process.cwd()

const FOLDERS = {
  inbox: "00 Входящие",
  ideas: "10 Идеи",
  concepts: "20 Концепты",
  plans: "30 Планы",
  docs: "40 Документы",
  maps: "50 Карты",
  templates: "90 Шаблоны",
}

const TYPES = {
  идея: { folder: FOLDERS.ideas, template: "Идея.md" },
  концепт: { folder: FOLDERS.concepts, template: "Концепт.md" },
  план: { folder: FOLDERS.plans, template: "План.md" },
  документ: { folder: FOLDERS.docs, template: "Документ.md" },
  вопрос: { folder: FOLDERS.inbox, template: "Вопрос.md" },
}

const TEMPLATES = {
  "Идея.md": `---
type: идея
status: черновик
project: 
sphere: 
created: {{date}}
tags: []
---

# {{title}}

Одна мысль, 2-3 предложения. Если мыслей несколько — это несколько заметок.

## Почему это может сработать

## Связи

- [[ ]]

## Открытые вопросы

- 
`,
  "Концепт.md": `---
type: концепт
status: черновик
project: 
sphere: 
created: {{date}}
tags: []
---

# {{title}}

О чём игра и почему в неё захочется играть.

## Фантазия игрока

## Основной цикл

1. 
2. 
3. 

## Столпы

- 
- 
- 

## Что делает это непохожим на другие

## Связи

- [[ ]]

## Риски
`,
  "План.md": `---
type: план
status: черновик
project: 
sphere: 
created: {{date}}
tags: []
---

# {{title}}

## Цель

## Шаги

- [ ] 
- [ ] 
- [ ] 

## Что может пойти не так

## Связи

- [[ ]]
`,
  "Документ.md": `---
type: документ
status: черновик
project: 
sphere: 
created: {{date}}
tags: []
---

# {{title}}

## Контекст

## Решение

## Последствия

## Связи

- [[ ]]
`,
  "Вопрос.md": `---
type: вопрос
status: открыт
project: 
sphere: 
created: {{date}}
tags: []
---

# {{title}}

## В чём неопределённость

## Варианты

- 
- 

## Что нужно узнать, чтобы решить

## Связи

- [[ ]]
`,
}

function resolveVault() {
  const explicit = flag("vault")
  if (explicit) return path.resolve(explicit)
  if (process.env.OBSIDIAN_VAULT) return path.resolve(process.env.OBSIDIAN_VAULT)

  const configPath = path.join(ROOT, "production", "obsidian.json")
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
      if (config.vault) return path.resolve(config.vault)
    } catch {
      // fall through to the error below
    }
  }

  console.error("obsidian: vault not configured.")
  console.error("Set it once in production/obsidian.json: { \"vault\": \"D:\\\\Obsidian Case\\\\Game Development\" }")
  console.error("or pass --vault <path>, or set OBSIDIAN_VAULT.")
  process.exit(2)
}

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".obsidian" || entry.name === ".trash") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith(".md")) out.push(full)
  }
  return out
}

function readFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!pair) continue
    const value = pair[2].trim()
    data[pair[1]] = value.startsWith("[") && value.endsWith("]")
      ? value.slice(1, -1).split(",").map((v) => v.trim()).filter(Boolean)
      : value
  }
  return data
}

function titleOf(text) {
  const heading = text.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : ""
}

function linksOf(text) {
  const out = []
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
    const target = match[1].trim()
    if (target) out.push(target)
  }
  return out
}

function noteIndex(vault) {
  const notes = walk(vault).map((file) => {
    const text = fs.readFileSync(file, "utf8")
    const base = path.basename(file, ".md")
    return {
      file,
      base,
      rel: path.relative(vault, file).split(path.sep).join("/"),
      title: titleOf(text) || base,
      frontmatter: readFrontmatter(text),
      links: linksOf(text),
      text,
    }
  })
  const byName = new Map()
  for (const note of notes) {
    for (const key of [note.base, note.title]) {
      if (!byName.has(key)) byName.set(key, note)
    }
  }
  return { notes, byName }
}

function safeTitle(title) {
  return title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function cmdVault() {
  const vault = resolveVault()
  const exists = fs.existsSync(vault)
  const { notes } = exists ? noteIndex(vault) : { notes: [] }
  console.log("")
  console.log(`  Vault: ${vault}`)
  console.log(`  Exists: ${exists ? "yes" : "no"}`)
  console.log(`  Notes: ${notes.length}`)
  if (exists) {
    for (const folder of Object.values(FOLDERS)) {
      const full = path.join(vault, folder)
      const count = fs.existsSync(full) ? walk(full).length : 0
      console.log(`    ${folder.padEnd(16)} ${count}`)
    }
  }
  console.log("")
}

function cmdInit() {
  const vault = resolveVault()
  fs.mkdirSync(vault, { recursive: true })
  let created = 0

  for (const folder of Object.values(FOLDERS)) {
    const full = path.join(vault, folder)
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true })
      created++
    }
  }

  for (const [name, body] of Object.entries(TEMPLATES)) {
    const full = path.join(vault, FOLDERS.templates, name)
    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, body, "utf8")
      created++
    }
  }

  const readme = path.join(vault, "Как устроено.md")
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `---
type: документ
status: готово
created: ${today()}
tags: [система]
---

# Как устроено

Хранилище ведёт агент. Здесь только ваши идеи, концепты и планы — на русском.

## Папки

- **00 Входящие** — быстрые мысли и вопросы, ещё не разобранные
- **10 Идеи** — одна идея = одна заметка
- **20 Концепты** — оформленные концепты игр
- **30 Планы** — спринты, вехи, чек-листы
- **40 Документы** — решения и описания
- **50 Карты** — карты содержания, собираются автоматически
- **90 Шаблоны** — шаблоны заметок, можно править

## Правила

1. Одна заметка — одна мысль. Несколько мыслей — несколько заметок.
2. Новая заметка ссылается минимум на две существующие.
3. Заголовок короткий и уникальный: он же имя ссылки.
4. Перед созданием агент ищет похожие заметки, чтобы не плодить дубли.

## Связи

- [[Карта — идея]]
- [[Карта — концепт]]
`,
      "utf8",
    )
    created++
  }

  console.log(`  Vault: ${vault}`)
  console.log(`  Created: ${created} item(s)`)
  if (created === 0) console.log("  Nothing to do — structure already exists.")
}

function cmdSearch() {
  const vault = resolveVault()
  const query = positional.join(" ").trim()
  if (!query) {
    console.error('usage: node tools/obsidian.mjs search "<query>"')
    process.exit(2)
  }
  const needle = query.toLowerCase()
  const { notes } = noteIndex(vault)
  const hits = notes.filter(
    (note) => note.title.toLowerCase().includes(needle) || note.text.toLowerCase().includes(needle),
  )

  console.log("")
  if (!hits.length) {
    console.log(`  Nothing matches "${query}".`)
  } else {
    console.log(`  ${hits.length} note(s) match "${query}":`)
    for (const note of hits.slice(0, 20)) {
      const type = note.frontmatter.type ?? "—"
      console.log(`    [${type}] ${note.title}`)
      console.log(`         ${note.rel}`)
    }
  }
  console.log("")
}

function cmdNew() {
  const vault = resolveVault()
  const type = positional[0]
  const rawTitle = positional.slice(1).join(" ").trim()

  if (!type || !rawTitle) {
    console.error('usage: node tools/obsidian.mjs new <тип> "<заголовок>"')
    console.error(`types: ${Object.keys(TYPES).join(", ")}`)
    process.exit(2)
  }
  const spec = TYPES[type]
  if (!spec) {
    console.error(`unknown type "${type}". Use: ${Object.keys(TYPES).join(", ")}`)
    process.exit(2)
  }

  const title = safeTitle(rawTitle)
  const { byName } = noteIndex(vault)
  const existing = byName.get(title)
  if (existing) {
    console.error(`a note with that title already exists: ${existing.rel}`)
    console.error("link to it instead of creating a duplicate")
    process.exit(1)
  }

  const templatePath = path.join(vault, FOLDERS.templates, spec.template)
  const template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf8")
    : TEMPLATES[spec.template]

  const body = template.replaceAll("{{title}}", title).replaceAll("{{date}}", today())
  const folder = path.join(vault, spec.folder)
  fs.mkdirSync(folder, { recursive: true })
  const file = path.join(folder, `${title}.md`)
  fs.writeFileSync(file, body, "utf8")

  console.log(`  created: ${path.relative(vault, file).split(path.sep).join("/")}`)
  console.log("  next: add at least two [[links]] in the Связи section")
}

function cmdCheck() {
  const vault = resolveVault()
  const { notes, byName } = noteIndex(vault)

  const content = notes.filter((note) => !note.rel.startsWith(FOLDERS.templates))
  const broken = []
  const orphan = []
  const duplicateTitles = new Map()

  for (const note of content) {
    if (note.title) {
      const list = duplicateTitles.get(note.title) ?? []
      list.push(note.rel)
      duplicateTitles.set(note.title, list)
    }
    for (const link of note.links) {
      if (!byName.has(link)) broken.push(`${note.rel} -> [[${link}]]`)
    }
  }

  const inbound = new Map()
  for (const note of content) {
    for (const link of note.links) {
      const target = byName.get(link)
      if (target) inbound.set(target.rel, (inbound.get(target.rel) ?? 0) + 1)
    }
  }
  for (const note of content) {
    // Map cards are generated; an empty card is expected, not an orphan.
    if (note.rel.startsWith(FOLDERS.maps)) continue
    if ((inbound.get(note.rel) ?? 0) === 0 && note.links.length === 0) orphan.push(note.rel)
  }

  const dupes = [...duplicateTitles.entries()].filter(([, list]) => list.length > 1)

  console.log("")
  console.log(`  Vault: ${vault}`)
  console.log(`  Notes: ${content.length} (+${notes.length - content.length} templates)`)

  // Graph readability: a note with no sphere lands in no card, and every one of
  // them is a loose node in the graph view. Advice, not an error.
  const withoutSphere = content.filter(
    (note) => !note.rel.startsWith(FOLDERS.maps) && !String(note.frontmatter.sphere ?? "").trim(),
  )
  const crowded = content.filter((note) => !note.rel.startsWith(FOLDERS.maps) && note.links.length > 6)
  if (withoutSphere.length) {
    console.log(`  No sphere (${withoutSphere.length}) — they appear in no card:`)
    for (const note of withoutSphere.slice(0, 10)) console.log(`    ${note.rel}`)
  }
  if (crowded.length) {
    console.log(`  More than 6 links (${crowded.length}) — a hub, not a note:`)
    for (const note of crowded.slice(0, 10)) console.log(`    ${note.rel} (${note.links.length} links)`)
  }
  if (!broken.length && !orphan.length && !dupes.length) {
    console.log("  Links: OK — no broken links, no orphans, no duplicate titles")
  } else {
    if (broken.length) {
      console.log(`  Broken links (${broken.length}):`)
      for (const item of broken.slice(0, 20)) console.log(`    ${item}`)
    }
    if (dupes.length) {
      console.log(`  Duplicate titles (${dupes.length}):`)
      for (const [title, list] of dupes) console.log(`    "${title}": ${list.join(", ")}`)
    }
    if (orphan.length) {
      console.log(`  Orphans (${orphan.length}) — no links in or out:`)
      for (const item of orphan.slice(0, 20)) console.log(`    ${item}`)
    }
  }
  console.log("")
  process.exitCode = broken.length || dupes.length ? 1 : 0
}

function cmdIndex() {
  const vault = resolveVault()
  const { notes } = noteIndex(vault)
  const mapsDir = path.join(vault, FOLDERS.maps)
  fs.mkdirSync(mapsDir, { recursive: true })

  const groups = new Map()
  for (const note of notes) {
    if (note.rel.startsWith(FOLDERS.templates)) continue
    if (note.rel.startsWith(FOLDERS.maps)) continue
    const type = note.frontmatter.type ?? "без типа"
    const list = groups.get(type) ?? []
    list.push(note)
    groups.set(type, list)
  }

  let written = 0
  const allTypes = new Set([...Object.keys(TYPES), ...groups.keys()])
  for (const type of allTypes) {
    const list = groups.get(type) ?? []
    const file = path.join(mapsDir, `Карта — ${type}.md`)
    const body = [
      "---",
      "type: карта",
      `created: ${today()}`,
      "tags: [карта]",
      "---",
      "",
      `# Карта: ${type}`,
      "",
      "Собирается командой `node tools/obsidian.mjs index`. Руками не править.",
      "",
      ...(list.length
        ? list
            .sort((a, b) => a.title.localeCompare(b.title, "ru"))
            .map((note) => {
              const status = note.frontmatter.status ? ` — ${note.frontmatter.status}` : ""
              return `- [[${note.title}]]${status}`
            })
        : ["_Пока пусто._"]),
      "",
    ].join("\n")
    fs.writeFileSync(file, body, "utf8")
    written++
  }

  console.log(`  Cards written: ${written}`)
  for (const type of allTypes) console.log(`    Карта — ${type}.md`)

  // Sphere cards: the graph stays readable when every note has one home.
  // A note links up to its sphere; the sphere card lists its notes.
  const spheres = new Map()
  for (const note of notes) {
    if (note.rel.startsWith(FOLDERS.templates)) continue
    if (note.rel.startsWith(FOLDERS.maps)) continue
    const sphere = String(note.frontmatter.sphere ?? "").trim()
    if (!sphere) continue
    const list = spheres.get(sphere) ?? []
    list.push(note)
    spheres.set(sphere, list)
  }

  let sphereCards = 0
  for (const [sphere, list] of spheres) {
    const file = path.join(mapsDir, `Сфера — ${sphere}.md`)
    const body = [
      "---",
      "type: карта",
      "tags: [карта, сфера]",
      `created: ${today()}`,
      "---",
      "",
      `# Сфера: ${sphere}`,
      "",
      "Собирается командой `node tools/obsidian.mjs index`. Руками не править.",
      "",
      ...list
        .sort((a, b) => a.title.localeCompare(b.title, "ru"))
        .map((note) => {
          const type = note.frontmatter.type ? `${note.frontmatter.type} · ` : ""
          return `- [[${note.title}]] — ${type}${note.frontmatter.status ?? "черновик"}`
        }),
      "",
    ].join("\n")
    fs.writeFileSync(file, body, "utf8")
    sphereCards++
  }
  if (sphereCards) {
    console.log(`  Sphere cards: ${sphereCards}`)
    for (const sphere of spheres.keys()) console.log(`    Сфера — ${sphere}.md`)
  }
}

const command = args[0] ?? "vault"

try {
  switch (command) {
    case "vault": cmdVault(); break
    case "init": cmdInit(); break
    case "search": cmdSearch(); break
    case "new": cmdNew(); break
    case "check": cmdCheck(); break
    case "index": cmdIndex(); break
    default:
      console.error(`unknown command: ${command}`)
      console.error("commands: vault, init, search, new, check, index")
      process.exit(2)
  }
} catch (error) {
  console.error(`  error: ${error.message}`)
  process.exitCode = 1
}

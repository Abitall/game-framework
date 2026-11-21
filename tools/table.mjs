#!/usr/bin/env node
/**
 * Data tables: the owner edits TSV, the game imports JSON.
 *
 *   node tools/table.mjs apply [table] [--force]   data/*.tsv        -> src/data/*.json
 *   node tools/table.mjs pull  [table] [--force]   src/data/*.json   -> data/*.tsv
 *   node tools/table.mjs check [table]             report where the two disagree
 *
 * No dependencies. Two table shapes only:
 *   rows      header + one line per entity, `id` first      -> [ { ... }, ... ]
 *   key/value exactly two columns named `key` and `value`   -> { key: value }
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const TABLES = path.join(ROOT, "data")
const GENERATED = path.join(ROOT, "src", "data")
const COMMENT = "#"
const KEY = "key"
const VALUE = "value"

function fail(message) {
  console.error(`table: ${message}`)
  process.exit(1)
}

function note(message) {
  console.log(`table: ${message}`)
}

/* ---------------------------------------------------------------- io */

function listFiles(dir, extension) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .sort()
}

function pick(files, extension, only) {
  if (!only) return files
  const wanted = `${only}${extension}`
  const hit = files.filter((name) => name === wanted)
  if (hit.length === 0) fail(`no ${wanted} to work on`)
  return hit
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
  } catch (error) {
    fail(`${path.relative(ROOT, file)} is not valid JSON (${error.message})`)
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

/* -------------------------------------------------------------- cells */

/** A cell may hold a tab or a newline; both would break the table. */
function escapeCell(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\r?\n/g, "\\n")
}

function unescapeCell(value) {
  return value.replace(/\\(.)/g, (_, char) => {
    if (char === "t") return "\t"
    if (char === "n") return "\n"
    if (char === "r") return "\r"
    return char
  })
}

function cellText(value) {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return escapeCell(JSON.stringify(value))
  return escapeCell(value)
}

function infer(cell) {
  if (cell === "true" || cell === "false") return cell === "true"
  if (cell !== "" && /^-?\d+(\.\d+)?$/.test(cell) && cell.length < 16) return Number(cell)
  if (cell.startsWith("[") || cell.startsWith("{")) {
    try {
      return JSON.parse(cell)
    } catch {
      return cell
    }
  }
  return cell
}

function coerce(cell, hint, where) {
  if (hint === undefined) return infer(cell)
  if (hint === null) return cell
  if (typeof hint === "number") {
    const parsed = Number(cell)
    if (cell === "" || Number.isNaN(parsed)) fail(`${where}: expected a number, got "${cell}"`)
    return parsed
  }
  if (typeof hint === "boolean") {
    if (cell !== "true" && cell !== "false") fail(`${where}: expected true or false, got "${cell}"`)
    return cell === "true"
  }
  if (typeof hint === "object") {
    try {
      return JSON.parse(cell)
    } catch {
      fail(`${where}: expected JSON, got "${cell}"`)
    }
  }
  return cell
}

/* -------------------------------------------------------------- parse */

function parseTsv(file) {
  const name = path.relative(ROOT, file)
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  const rows = []

  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === "") return
    if (line.trimStart().startsWith(COMMENT)) return
    rows.push({ line: index + 1, cells: line.split("\t").map((cell) => cell.trim()) })
  })

  if (rows.length === 0) fail(`${name}: the table has no header`)

  const header = rows.shift().cells
  if (header.some((cell) => cell === "")) fail(`${name}: empty column name in the header`)
  const duplicated = header.filter((cell, index) => header.indexOf(cell) !== index)
  if (duplicated.length > 0) fail(`${name}: duplicate column ${duplicated.join(", ")}`)

  for (const row of rows) {
    if (row.cells.length !== header.length) {
      fail(`${name}:${row.line} has ${row.cells.length} cells, the header has ${header.length}`)
    }
  }

  return { name, header, rows, keyValue: header.length === 2 && header[0] === KEY && header[1] === VALUE }
}

/* -------------------------------------------------------------- build */

function build(parsed, existing) {
  if (parsed.keyValue) {
    const out = {}
    for (const row of parsed.rows) {
      const key = row.cells[0]
      if (key === "") fail(`${parsed.name}:${row.line}: empty key`)
      if (Object.hasOwn(out, key)) fail(`${parsed.name}:${row.line}: duplicate key "${key}"`)
      out[key] = coerce(unescapeCell(row.cells[1]), existing ? existing[key] : undefined, `${parsed.name}:${row.line}`)
    }
    return out
  }

  const hintRow = Array.isArray(existing) && existing.length > 0 ? existing[0] : undefined
  const seen = new Set()
  const out = parsed.rows.map((row) => {
    const entity = {}
    parsed.header.forEach((column, index) => {
      const hint = hintRow === undefined ? undefined : hintRow[column]
      entity[column] = coerce(unescapeCell(row.cells[index]), hint, `${parsed.name}:${row.line}`)
    })
    if (parsed.header.includes("id")) {
      const id = String(entity.id)
      if (seen.has(id)) fail(`${parsed.name}:${row.line}: duplicate id "${id}"`)
      seen.add(id)
    }
    return entity
  })
  return out
}

/* ------------------------------------------------------------ serialize */

function toTsv(value) {
  if (Array.isArray(value)) {
    const columns = []
    for (const entity of value) {
      for (const column of Object.keys(entity)) if (!columns.includes(column)) columns.push(column)
    }
    if (columns.length === 0) fail("cannot pull a table with no rows")
    const lines = [columns.join("\t")]
    for (const entity of value) {
      lines.push(columns.map((column) => cellText(entity[column])).join("\t"))
    }
    return `${lines.join("\n")}\n`
  }

  if (value !== null && typeof value === "object") {
    const lines = [`${KEY}\t${VALUE}`]
    for (const [key, item] of Object.entries(value)) lines.push(`${key}\t${cellText(item)}`)
    return `${lines.join("\n")}\n`
  }

  fail("a table is either an array of entities or an object of named values")
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

/* ------------------------------------------------------------- commands */

function cmdApply(only, force) {
  const files = pick(listFiles(TABLES, ".tsv"), ".tsv", only)
  if (files.length === 0) return note("no data/*.tsv to apply — nothing generated")

  let written = 0
  for (const name of files) {
    const tsv = path.join(TABLES, name)
    const json = path.join(GENERATED, name.replace(/\.tsv$/, ".json"))
    const parsed = parseTsv(tsv)
    const existing = fs.existsSync(json) ? readJson(json) : undefined
    const value = build(parsed, existing)

    if (fs.existsSync(json) && canonical(existing) === canonical(value) && !force) {
      note(`${path.relative(ROOT, json)} already matches ${path.relative(ROOT, tsv)}`)
      continue
    }

    writeJson(json, value)
    written++
    note(`applied ${path.relative(ROOT, tsv)} -> ${path.relative(ROOT, json)}`)
  }
  note(`${written} of ${files.length} table(s) written`)
}

function cmdPull(only, force) {
  const files = pick(listFiles(GENERATED, ".json"), ".json", only)
  if (files.length === 0) return note("no src/data/*.json to pull — nothing to do")

  let written = 0
  let skipped = 0
  for (const name of files) {
    const json = path.join(GENERATED, name)
    const tsv = path.join(TABLES, name.replace(/\.json$/, ".tsv"))

    if (fs.existsSync(tsv) && !force) {
      skipped++
      note(`${path.relative(ROOT, tsv)} exists — use --force to overwrite it`)
      continue
    }

    fs.mkdirSync(TABLES, { recursive: true })
    fs.writeFileSync(tsv, toTsv(readJson(json)), "utf8")
    written++
    note(`pulled ${path.relative(ROOT, json)} -> ${path.relative(ROOT, tsv)}`)
  }
  note(`${written} table(s) written, ${skipped} skipped`)
}

function cmdCheck(only) {
  const files = pick(listFiles(TABLES, ".tsv"), ".tsv", only)
  if (files.length === 0) return note("no data/*.tsv to check — nothing to compare")

  const problems = []
  for (const name of files) {
    const tsv = path.join(TABLES, name)
    const json = path.join(GENERATED, name.replace(/\.tsv$/, ".json"))

    if (!fs.existsSync(json)) {
      problems.push(`${path.relative(ROOT, json)} is missing — run npm run data:apply`)
      continue
    }

    const value = build(parseTsv(tsv), readJson(json))
    if (canonical(value) !== canonical(readJson(json))) {
      problems.push(`${path.relative(ROOT, tsv)} and ${path.relative(ROOT, json)} disagree — run npm run data:apply`)
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ! ${problem}`)
    fail(`${problems.length} table(s) out of sync`)
  }
  note(`${files.length} table(s) in sync`)
}

/* ---------------------------------------------------------------- main */

const [command, ...rest] = process.argv.slice(2)
const only = rest.find((argument) => !argument.startsWith("--"))
const force = rest.includes("--force")

if (command === "apply") cmdApply(only, force)
else if (command === "pull") cmdPull(only, force)
else if (command === "check") cmdCheck(only)
else {
  console.error("usage: node tools/table.mjs apply|pull|check [table] [--force]")
  process.exit(1)
}

#!/usr/bin/env node
/**
 * Shut the machine down after a long task.
 *
 * The point: leave a task running overnight; if it finishes at 23:00, the machine
 * does not idle until morning. But an accidental shutdown is expensive, so the
 * command refuses to fire unless it was armed first.
 *
 * Usage:
 *   node tools/shutdown.mjs arm --reason "ночной прогон баланса"
 *   node tools/shutdown.mjs status
 *   node tools/shutdown.mjs now [--delay 90] [--dry-run]
 *   node tools/shutdown.mjs cancel
 *
 * Rules:
 *   - `now` refuses without an armed marker younger than 12 hours.
 *   - `now` warns when the working tree has uncommitted changes.
 *   - `cancel` aborts a scheduled shutdown and clears the marker.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const MARKER = path.join(ROOT, "production", "shutdown.json")
const MAX_AGE_HOURS = 12

const args = process.argv.slice(2)
const command = args[0] ?? "status"
const flag = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const has = (name) => args.includes(`--${name}`)

function readMarker() {
  if (!fs.existsSync(MARKER)) return null
  try {
    return JSON.parse(fs.readFileSync(MARKER, "utf8").replace(/^\uFEFF/, ""))
  } catch {
    return null
  }
}

function writeMarker(data) {
  fs.mkdirSync(path.dirname(MARKER), { recursive: true })
  fs.writeFileSync(MARKER, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

function ageHours(iso) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function gitDirty() {
  const result = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8", windowsHide: true })
  if (result.status !== 0) return null
  return result.stdout.trim().split(/\r?\n/).filter(Boolean)
}

function scheduleShutdown(delaySeconds, reason) {
  const platform = process.platform
  if (platform === "win32") {
    const comment = `Task finished: ${reason}`.slice(0, 200)
    const result = spawnSync("shutdown", ["/s", "/t", String(delaySeconds), "/c", comment], {
      encoding: "utf8",
      windowsHide: true,
    })
    return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() }
  }
  if (platform === "darwin") {
    const minutes = Math.max(1, Math.round(delaySeconds / 60))
    const script = `tell application "System Events" to shut down`
    const result = spawnSync("osascript", ["-e", script], { encoding: "utf8", windowsHide: true })
    return { ok: result.status === 0, output: result.stderr?.trim() ?? `shutdown in ~${minutes} min` }
  }
  const minutes = Math.max(1, Math.round(delaySeconds / 60))
  const result = spawnSync("shutdown", ["-h", `+${minutes}`], { encoding: "utf8", windowsHide: true })
  return { ok: result.status === 0, output: result.stderr?.trim() ?? "" }
}

function cancelShutdown() {
  if (process.platform === "win32") {
    const result = spawnSync("shutdown", ["/a"], { encoding: "utf8", windowsHide: true })
    return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() }
  }
  if (process.platform === "darwin") return { ok: true, output: "nothing to cancel on macOS" }
  return { ok: true, output: "nothing to cancel on this platform" }
}

function cmdArm() {
  const reason = flag("reason")
  if (!reason) {
    console.error('usage: node tools/shutdown.mjs arm --reason "why the machine can sleep"')
    process.exit(2)
  }
  writeMarker({ armedAt: new Date().toISOString(), reason })
  console.log(`  armed: ${reason}`)
  console.log("  the machine will stay on until `now` or `cancel`")
}

function cmdStatus() {
  const marker = readMarker()
  console.log("")
  if (!marker) {
    console.log("  Shutdown: not armed")
  } else {
    const age = ageHours(marker.armedAt)
    const stale = age > MAX_AGE_HOURS
    console.log(`  Shutdown: armed ${age.toFixed(1)}h ago${stale ? " (stale — `now` will refuse)" : ""}`)
    console.log(`  Reason: ${marker.reason}`)
  }
  console.log("")
}

function cmdNow() {
  const marker = readMarker()
  if (!marker) {
    console.error("  refused: not armed. Run `arm --reason \"...\"` first, and only when the user asked for it.")
    process.exit(1)
  }
  const age = ageHours(marker.armedAt)
  if (age > MAX_AGE_HOURS) {
    console.error(`  refused: armed ${age.toFixed(1)}h ago, older than ${MAX_AGE_HOURS}h. Re-arm if it still applies.`)
    process.exit(1)
  }

  const delay = Number(flag("delay", "90"))
  const dirty = gitDirty()
  if (dirty && dirty.length) {
    console.log(`  warning: ${dirty.length} uncommitted change(s). Files survive a shutdown; commits do not.`)
    for (const line of dirty.slice(0, 5)) console.log(`    ${line}`)
  }

  if (has("dry-run")) {
    console.log(`  dry run: would schedule shutdown in ${delay}s on ${process.platform}`)
    return
  }

  const result = scheduleShutdown(delay, marker.reason)
  if (!result.ok) {
    console.error(`  failed: ${result.output || "the system refused the request"}`)
    process.exit(1)
  }
  console.log(`  shutdown scheduled in ${delay}s`)
  console.log(`  cancel: node tools/shutdown.mjs cancel`)
  console.log("  write your final report BEFORE this point; after shutdown nobody sees the session")
}

function cmdCancel() {
  const result = cancelShutdown()
  if (fs.existsSync(MARKER)) fs.rmSync(MARKER)
  console.log(`  cancelled: ${result.output || "ok"}`)
  console.log("  marker cleared")
}

try {
  switch (command) {
    case "arm": cmdArm(); break
    case "status": cmdStatus(); break
    case "now": cmdNow(); break
    case "cancel": cmdCancel(); break
    default:
      console.error(`unknown command: ${command}`)
      console.error("commands: arm, status, now, cancel")
      process.exit(2)
  }
} catch (error) {
  console.error(`  error: ${error.message}`)
  process.exitCode = 1
}

#!/usr/bin/env node
/**
 * Publish a playtest snapshot.
 *
 * Builds the game into `dist-play/`, which `tools/play-host.mjs` serves on port
 * 5173. This is the ONLY supported way to change what the human is playing.
 *
 * The agent must never run this on its own initiative: the user asks for it.
 *
 * Usage:
 *   node tools/publish-play.mjs [--mode production]
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const OUT = path.join(ROOT, "dist-play")

const vite = path.join(ROOT, "node_modules", "vite", "bin", "vite.js")
if (!fs.existsSync(vite)) {
  console.error("Publish play: vite is not installed.")
  console.error('Run "npm install" and make sure this project has a vite build.')
  process.exit(1)
}

const args = process.argv.slice(2)
const modeIndex = args.indexOf("--mode")
const mode = modeIndex >= 0 && args[modeIndex + 1] ? args[modeIndex + 1] : "production"

const result = spawnSync(
  process.execPath,
  [vite, "build", "--outDir", "dist-play", "--emptyOutDir", "--mode", mode],
  { stdio: "inherit", cwd: ROOT, windowsHide: true },
)

if (result.status !== 0) {
  console.error("Publish play: build failed; the previous snapshot is untouched.")
  process.exit(result.status ?? 1)
}

const stamp = new Date().toISOString()
fs.writeFileSync(path.join(OUT, ".published"), `${stamp}\n`, "utf8")
console.log(`\nPublished playtest snapshot at ${stamp}`)
console.log("Play host serves it on http://localhost:5173 (no restart needed).")

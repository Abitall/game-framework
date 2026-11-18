#!/usr/bin/env node
/**
 * Playtest host.
 *
 * Serves `dist-play/` on port 5173 for the human player. The agent works on the
 * dev server (port 5174) and never writes here. The directory changes only when
 * the user runs `/publish-play` or `npm run publish:play`.
 *
 * Files are read from disk per request, so publishing needs no restart.
 *
 * Usage:
 *   node tools/play-host.mjs [--port 5173] [--dir dist-play]
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const PORT = Number(readArg("--port", process.env.PLAY_HOST_PORT ?? 5173))
const ROOT = path.resolve(readArg("--dir", "dist-play"))

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
}

function resolveTarget(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0])
  const relative = decoded.replace(/^\/+/, "")
  const candidate = path.resolve(ROOT, relative)
  if (!candidate.startsWith(ROOT)) return null
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const index = path.join(candidate, "index.html")
    return fs.existsSync(index) ? index : null
  }
  if (fs.existsSync(candidate)) return candidate
  const fallback = path.join(ROOT, "index.html")
  return fs.existsSync(fallback) ? fallback : null
}

if (!fs.existsSync(ROOT)) {
  console.error(`Play host: ${ROOT} does not exist yet.`)
  console.error("Run `npm run publish:play` first to build a playtest snapshot.")
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const target = resolveTarget(req.url ?? "/")
  if (!target) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }
  const ext = path.extname(target).toLowerCase()
  res.writeHead(200, {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "cache-control": "no-cache",
  })
  fs.createReadStream(target).pipe(res)
})

server.listen(PORT, () => {
  console.log(`Playtest host: http://localhost:${PORT}  (serving ${ROOT})`)
  console.log("This snapshot changes only on /publish-play.")
})

#!/usr/bin/env node
/**
 * Screenshot capture for gauntlet rounds and visual checks.
 *
 * Zero dependencies: drives an installed Chrome or Edge in headless mode.
 * The page gets `--wait` milliseconds of virtual time to boot before the shot.
 *
 * Usage:
 *   node tools/capture.mjs --url http://localhost:5174 --out shots/menu.png
 *   node tools/capture.mjs --serve dist --url / --out shots/game.png --wait 4000
 *   node tools/capture.mjs --url http://localhost:5173 --out shots/a.png --size 390x844
 *
 * Options:
 *   --url <url>        page to capture (required)
 *   --out <file>       output png (required)
 *   --size WxH         viewport, default 1280x720
 *   --wait <ms>        virtual time budget, default 3000
 *   --serve <dir>      serve a directory locally and prepend it to the url
 *   --port <n>         port for --serve, default 5178
 *   --browser <path>   explicit browser binary (or set CHROME_PATH)
 */
import fs from "node:fs"
import path from "node:path"
import http from "node:http"
import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const flag = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const url = flag("url")
const out = flag("out")
if (!url || !out) {
  console.error("usage: node tools/capture.mjs --url <url> --out <file> [--size 1280x720] [--wait 3000] [--serve dir]")
  process.exit(2)
}

const [width, height] = (flag("size", "1280x720").split("x").map(Number))
const wait = Number(flag("wait", "3000"))
const serveDir = flag("serve")
const servePort = Number(flag("port", "5178"))

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
].filter(Boolean)

const explicit = flag("browser")
const browser = explicit || CANDIDATES.find((candidate) => fs.existsSync(candidate))
if (!browser) {
  console.error("capture: no Chrome or Edge found. Set CHROME_PATH or pass --browser <path>.")
  process.exit(1)
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
}

let server = null
let target = url

if (serveDir) {
  const root = path.resolve(serveDir)
  if (!fs.existsSync(root)) {
    console.error(`capture: --serve directory does not exist: ${root}`)
    process.exit(1)
  }
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "")
    let file = path.resolve(root, requested)
    if (!file.startsWith(root)) {
      res.writeHead(403).end()
      return
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html")
    if (!fs.existsSync(file)) file = path.join(root, "index.html")
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("not found")
      return
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream" })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(servePort, resolve))
  const suffix = url.startsWith("/") ? url : `/${url}`
  target = `http://localhost:${servePort}${suffix}`
}

const outFile = path.resolve(out)
fs.mkdirSync(path.dirname(outFile), { recursive: true })
if (fs.existsSync(outFile)) fs.rmSync(outFile)

const chromeArgs = [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--mute-audio",
  "--no-first-run",
  "--no-default-browser-check",
  "--force-device-scale-factor=1",
  `--window-size=${width},${height}`,
  `--virtual-time-budget=${wait}`,
  `--screenshot=${outFile}`,
  target,
]

const exitCode = await new Promise((resolve) => {
  const child = spawn(browser, chromeArgs, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true })
  let stderr = ""
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString()
  })
  child.on("error", (error) => {
    console.error(`capture: failed to launch browser: ${error.message}`)
    resolve(1)
  })
  child.on("exit", (code) => {
    if (code !== 0 && !fs.existsSync(outFile)) {
      console.error(`capture: browser exited with ${code}`)
      const interesting = stderr.split("\n").filter((line) => /error|fail/i.test(line)).slice(0, 5)
      for (const line of interesting) console.error(`  ${line.trim()}`)
    }
    resolve(code ?? 1)
  })
})

if (server) server.close()

if (!fs.existsSync(outFile)) {
  console.error(`capture: no file produced at ${outFile}`)
  process.exit(1)
}

const size = fs.statSync(outFile).size
if (size < 1024) {
  console.error(`capture: ${outFile} is only ${size} bytes — the page probably did not render`)
  process.exit(1)
}

console.log(`captured ${path.relative(process.cwd(), outFile)} (${width}x${height}, ${Math.round(size / 1024)} KB) from ${target}`)
process.exitCode = exitCode === 0 ? 0 : 0

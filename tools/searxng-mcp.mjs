#!/usr/bin/env node
/**
 * Minimal MCP server for a local SearXNG instance.
 *
 * No dependencies: JSON-RPC 2.0 over stdio, newline-delimited.
 * Tools: search (query → results) and fetch (url → text).
 *
 * Requires a running SearXNG with JSON output enabled:
 *   npm run search:up
 *   SEARXNG_URL=http://localhost:8888
 */
import readline from "node:readline"

const BASE = (process.env.SEARXNG_URL ?? "http://localhost:8888").replace(/\/+$/, "")
const TIMEOUT_MS = Number(process.env.SEARXNG_TIMEOUT_MS ?? 15000)

const TOOLS = [
  {
    name: "search",
    description:
      "Search the web through the local SearXNG instance. Returns titles, URLs and snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        count: { type: "number", description: "Max results, default 8" },
        language: { type: "string", description: "Language code, e.g. en, ru" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch",
    description: "Fetch a URL and return readable text (HTML stripped, truncated).",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute http(s) URL" },
        maxChars: { type: "number", description: "Truncate to this length, default 8000" },
      },
      required: ["url"],
    },
  },
]

async function searxSearch({ query, count = 8, language }) {
  const url = new URL(`${BASE}/search`)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "json")
  if (language) url.searchParams.set("language", language)

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`SearXNG responded ${response.status} at ${url}`)
  }
  const data = await response.json()
  const results = (data.results ?? []).slice(0, Math.max(1, Math.min(20, count)))
  if (!results.length) return "No results."

  return results
    .map((r, i) => {
      const snippet = String(r.content ?? "").replace(/\s+/g, " ").trim()
      return `${i + 1}. ${r.title ?? "(no title)"}\n   ${r.url}\n   ${snippet}`
    })
    .join("\n\n")
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function fetchUrl({ url, maxChars = 8000 }) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Only http(s) URLs are allowed")
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "Mozilla/5.0 (compatible; game-framework-searxng-mcp)" },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const type = response.headers.get("content-type") ?? ""
  const raw = await response.text()
  const text = type.includes("html") ? htmlToText(raw) : raw
  const limit = Math.max(500, Math.min(40000, maxChars))
  return text.length > limit ? `${text.slice(0, limit)}\n\n… truncated at ${limit} chars` : text
}

async function callTool(name, args) {
  if (name === "search") return searxSearch(args ?? {})
  if (name === "fetch") return fetchUrl(args ?? {})
  throw new Error(`unknown tool: ${name}`)
}

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`)
}

function replyError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`)
}

const rl = readline.createInterface({ input: process.stdin })

rl.on("line", async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let message
  try {
    message = JSON.parse(trimmed)
  } catch {
    return
  }

  const { id, method, params } = message
  if (id === undefined) return // notification

  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "searxng", version: "1.0.0" },
      })
      return
    }
    if (method === "tools/list") {
      reply(id, { tools: TOOLS })
      return
    }
    if (method === "tools/call") {
      const text = await callTool(params?.name, params?.arguments)
      reply(id, { content: [{ type: "text", text }] })
      return
    }
    replyError(id, -32601, `method not found: ${method}`)
  } catch (error) {
    replyError(id, -32000, error.message ?? String(error))
  }
})

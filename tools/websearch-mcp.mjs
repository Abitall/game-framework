#!/usr/bin/env node
/**
 * Web search MCP server with two providers.
 *
 *   1. SearXNG — self-hosted, no API keys, aggregates many engines.
 *   2. DuckDuckGo HTML — no setup at all, used when SearXNG is not running.
 *
 * Neither provider needs an API key or a paid account. SearXNG is the better
 * choice when it runs; DuckDuckGo is the zero-install fallback.
 *
 * No dependencies: JSON-RPC 2.0 over stdio, newline-delimited.
 * Tools: search (query -> results) and fetch (url -> text).
 *
 * Environment:
 *   SEARXNG_URL       default http://localhost:8888
 *   SEARCH_PROVIDER   auto | searxng | duckduckgo   (default auto)
 *   SEARCH_TIMEOUT_MS default 15000
 */
import readline from "node:readline"

const BASE = (process.env.SEARXNG_URL ?? "http://localhost:8888").replace(/\/+$/, "")
const PROVIDER = (process.env.SEARCH_PROVIDER ?? "auto").toLowerCase()
const TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS ?? 15000)
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

const TOOLS = [
  {
    name: "search",
    description:
      "Search the web. Uses the local SearXNG instance when it is running, otherwise DuckDuckGo. No API key, no cost.",
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

function clampCount(value, fallback = 8) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(1, Math.min(20, Math.trunc(number)))
}

function formatResults(provider, results) {
  if (!results.length) return `[${provider}] No results.`
  const body = results
    .map((r, i) => `${i + 1}. ${r.title || "(no title)"}\n   ${r.url}\n   ${r.snippet}`)
    .join("\n\n")
  return `[${provider}] ${results.length} result(s)\n\n${body}`
}

// ── SearXNG ──────────────────────────────────────────────────────────────────

async function searxSearch({ query, count = 8, language }) {
  const url = new URL(`${BASE}/search`)
  url.searchParams.set("q", query)
  url.searchParams.set("format", "json")
  if (language) url.searchParams.set("language", language)

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error(`SearXNG responded ${response.status}`)
  const data = await response.json()
  const results = (data.results ?? []).slice(0, clampCount(count)).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: String(r.content ?? "").replace(/\s+/g, " ").trim(),
  }))
  return formatResults("searxng", results)
}

// ── DuckDuckGo HTML ──────────────────────────────────────────────────────────

function decodeDuckDuckGoUrl(href) {
  const cleaned = href.replace(/&amp;/g, "&")
  const match = cleaned.match(/[?&]uddg=([^&]+)/)
  if (match) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return cleaned
    }
  }
  if (cleaned.startsWith("//")) return `https:${cleaned}`
  return cleaned
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function duckduckgoSearch({ query, count = 8, language }) {
  const url = new URL("https://html.duckduckgo.com/html/")
  url.searchParams.set("q", query)
  if (language === "ru") url.searchParams.set("kl", "ru-ru")

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
  })
  if (!response.ok) throw new Error(`DuckDuckGo responded ${response.status}`)

  const html = await response.text()
  if (/anomaly|captcha|unusual traffic/i.test(html)) {
    throw new Error("DuckDuckGo returned a captcha; wait a minute or use SearXNG")
  }

  const titles = [...html.matchAll(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  const snippets = [...html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]

  const results = titles.slice(0, clampCount(count)).map((match, index) => ({
    url: decodeDuckDuckGoUrl(match[1]),
    title: stripTags(match[2]),
    snippet: snippets[index] ? stripTags(snippets[index][1]) : "",
  }))

  return formatResults("duckduckgo", results)
}

// ── Provider selection ───────────────────────────────────────────────────────

async function search(args) {
  if (PROVIDER === "searxng") return searxSearch(args)
  if (PROVIDER === "duckduckgo") return duckduckgoSearch(args)

  try {
    return await searxSearch(args)
  } catch (error) {
    const reason = error.name === "TimeoutError" ? "timed out" : error.message
    try {
      return await duckduckgoSearch(args)
    } catch (fallbackError) {
      throw new Error(
        `both providers failed. SearXNG (${BASE}): ${reason}. DuckDuckGo: ${fallbackError.message}. ` +
          "Start SearXNG with `npm run search:up`, or check the network.",
      )
    }
  }
}

// ── fetch ────────────────────────────────────────────────────────────────────

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
  let response
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    })
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error(`no response from ${url} within ${Math.round(TIMEOUT_MS / 1000)}s`)
    }
    throw error
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const type = response.headers.get("content-type") ?? ""
  const raw = await response.text()
  const text = type.includes("html") ? htmlToText(raw) : raw
  const limit = Math.max(500, Math.min(40000, Number(maxChars) || 8000))
  return text.length > limit ? `${text.slice(0, limit)}\n\n… truncated at ${limit} chars` : text
}

// ── MCP plumbing ─────────────────────────────────────────────────────────────

async function callTool(name, args) {
  if (name === "search") return search(args ?? {})
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
  if (id === undefined) return

  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "websearch", version: "2.0.0" },
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

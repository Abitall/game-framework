# Local web search (SearXNG)

Free web search without API keys. SearXNG aggregates several engines and returns
JSON; `tools/searxng-mcp.mjs` exposes it to OpenCode as two tools: `search` and
`fetch`.

## Start

```bash
npm run search:up      # docker compose up -d
# http://localhost:8888 — the SearXNG UI
npm run search:down    # stop
```

Requires Docker Desktop. First start pulls ~200 MB.

## Enable in OpenCode

The MCP server is defined in `opencode.json` as `searxng`, disabled by default.
Enable it when you need web search:

```json
"searxng": {
  "type": "local",
  "command": ["node", "tools/searxng-mcp.mjs"],
  "codemode": false,
  "environment": { "SEARXNG_URL": "{env:SEARXNG_URL}" }
}
```

Set `SEARXNG_URL=http://localhost:8888` in your environment, or rely on the
default.

## Verify

```bash
curl "http://localhost:8888/search?q=phaser+4&format=json" | head -c 300
```

If that returns HTML instead of JSON, the settings file is not mounted — check
that `tools/searxng/settings.yml` exists and `search.formats` includes `json`.

## Fallback without Docker

`webfetch` on `https://html.duckduckgo.com/html/?q=<query>` works with no setup.
It is less reliable and returns unstructured HTML, but it needs nothing.

## Notes

- SearXNG is local-only. Nothing leaves the machine except the queries it sends
  to the upstream engines.
- `limiter: false` is fine for a single local user; do not expose the port.
- If results are empty for a query, try adding `!go` or `!ddg` to force an
  engine.

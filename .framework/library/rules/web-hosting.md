---
paths:
  - "src/**"
  - "tools/**"
  - "package.json"
  - "vite.config.*"
---

# Web Hosting Rules

A web project runs two independent hosts.

| Host | Port | Owner | Updates |
|---|---|---|---|
| Dev | **5174** | the agent | continuously, HMR |
| Play | **5173** | the human | only on `/publish-play` |

Hard rules:

- Never start, stop, or reconfigure anything on port **5173**. That is the
  human's playtest session.
- Never write to `dist-play/` except through `npm run publish:play`.
- Never run `publish:play` on your own initiative. The user asks; you run it.
- The dev server always uses `--port 5174 --strictPort`, so a port clash fails
  loudly instead of silently moving to the playtest port.
- If the user reports "the game did not change", check whether they are on 5173
  and remind them that the playtest snapshot is published on request.

Commands:

```bash
npm run dev           # dev host, port 5174
npm run play          # playtest host, port 5173, serves dist-play/
npm run publish:play  # build dist-play/ — only on request
```

`PLAY_HOST_PORT` overrides 5173 if the user needs another port.

# Local browser autonomy

Game Shop can use a Playwright MCP browser running on the same machine as the local Game Shop process. This gives Codex or another local MCP client a closed browser feedback lane without requiring a hosted browser provider for every development check.

## Default behavior

On a normal local runtime, Game Shop treats `http://localhost:8931/mcp` as the default Playwright MCP endpoint when `GAME_SHOP_PLAYWRIGHT_MCP_URL` is not set.

When browser QA needs the Playwright lane, Game Shop checks the endpoint first. If it is unavailable, Chromium is already installed, and the endpoint is loopback-only, Game Shop can start the pinned Playwright MCP process automatically and wait for it to become reachable before continuing QA.

Automatic startup is disabled in CI and Vercel. Game Shop never auto-starts a remote Playwright endpoint.

## Commands

```bash
npm run setup:playwright
npm run playwright:local
npm run playwright:local:status
```

`npm run playwright:local` is an explicit one-command bootstrap. In normal local browser QA it should not be necessary because the browser QA path calls the same ensure routine automatically.

## MCP tool

`gameshop_local_browser_autonomy`

- `action: "status"` reports endpoint, reachability, Chromium readiness, and whether managed startup is supported.
- `action: "ensure"` starts the local loopback Playwright MCP process if needed and returns when it is reachable or the bounded startup window expires.

`gameshop_playwright_lane` remains the broader Test/CLI/MCP lane status tool.

## Environment overrides

- `GAME_SHOP_PLAYWRIGHT_MCP_URL` — explicit Playwright MCP endpoint. A configured remote endpoint is respected, but Game Shop will not spawn it.
- `GAME_SHOP_LOCAL_BROWSER_AUTONOMY=false` — disables the implicit localhost lane and managed local startup.
- `GAME_SHOP_PLAYWRIGHT_CLI_ENABLED=true` — explicit CLI enable flag; local browser autonomy also enables the CLI role locally.

## Safety boundary

Managed startup is restricted to loopback addresses (`localhost`, `127.0.0.1`, `::1`). The Playwright MCP process is not exposed publicly by this feature. CI and Vercel remain separate execution environments and cannot reach a browser running on the user's Mac through localhost.

# Game Shop Integration Discovery

Game Shop evolves on two parallel tracks: core orchestration and capability discovery. Only verified programmable surfaces graduate into `src/integrations.ts`.

## Newly verified candidates

### Browserbase MCP + Stagehand
- Official hosted MCP: `https://mcp.browserbase.com/mcp`
- Local MCP: `npx @browserbasehq/mcp`
- Stagehand SDK: `@browserbasehq/stagehand`
- Capabilities: cloud browser sessions, natural-language act/observe/extract, screenshots, persistent contexts, E2E testing, session recordings, search/fetch/browser APIs.
- Game Shop role: browser verification worker for deployed websites/apps/games; visual smoke testing; autonomous QA after deployment.
- Credentials: `BROWSERBASE_API_KEY` and Browserbase project ID where required.

### Playwright MCP
- Official package: `@playwright/mcp@latest`
- Capabilities: browser automation, screenshots, persistent/isolated profiles, storage state, Chrome/Firefox/WebKit/Edge.
- Game Shop role: deterministic browser verification and repair evidence, especially where a local/CI browser is available.

## Registry discovery

The official MCP Registry exposes a REST API at `https://registry.modelcontextprotocol.io`. Game Shop should eventually add a discovery adapter that searches the official registry, scores candidates against capability gaps, and stages them as `research` until their auth/install/API contract is independently verified.

## Rule

Discovery never auto-enables paid services or grants credentials. New providers remain behind Game Shop spend, auth and write gates.

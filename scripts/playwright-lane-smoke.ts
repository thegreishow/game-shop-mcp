import { playwrightLaneStatus, playwrightMcpHealth } from "../src/playwright-lane.js";

const status = playwrightLaneStatus();
if (!status.firstClass) throw new Error("Playwright lane must be first-class.");
if (!status.packages.test.includes("@playwright/test")) throw new Error("Missing Playwright Test package metadata.");
if (!status.packages.cli.includes("@playwright/cli")) throw new Error("Missing Playwright CLI package metadata.");
if (!status.packages.mcp.includes("@playwright/mcp")) throw new Error("Missing Playwright MCP package metadata.");
if (!status.mcp.startCommand || !status.chromium.installCommand) throw new Error("Missing Playwright bootstrap commands.");

if (process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL) {
  const health = await playwrightMcpHealth({ live: true });
  if (!health.reachable) throw new Error("Configured Playwright MCP endpoint was not reachable.");
  if (!health.toolCount) throw new Error("Playwright MCP returned no tools.");
  console.log(`Playwright live MCP smoke OK: tools=${health.toolCount}; chromiumInstalled=${status.chromium.installed}.`);
} else {
  const health = await playwrightMcpHealth({ live: false });
  if (health.liveChecked) throw new Error("Static Playwright smoke must not make external requests.");
  console.log(`Playwright lane smoke OK: firstClass=true; chromiumInstalled=${status.chromium.installed}; live MCP skipped (not configured).`);
}

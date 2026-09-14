import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";
import { mcpInitialize, mcpListTools } from "./mcp-http-client.js";

export const PLAYWRIGHT_LANE = {
  testPackage: "@playwright/test@^1.63.0",
  cliPackage: "@playwright/cli@^0.1.19",
  mcpPackage: "@playwright/mcp@^0.0.80",
  defaultMcpUrl: "http://localhost:8931/mcp",
  startCommand: "npm run playwright:mcp",
  installBrowserCommand: "npm run setup:playwright",
  cliCommand: "npm run playwright:cli --",
} as const;

function configuredMcpUrl() {
  return process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL?.trim() || undefined;
}

function cliEnabled() {
  return process.env.GAME_SHOP_PLAYWRIGHT_CLI_ENABLED === "true";
}

export function playwrightLaneStatus() {
  const executablePath = chromium.executablePath();
  return {
    lane: "playwright",
    firstClass: true,
    packages: {
      test: PLAYWRIGHT_LANE.testPackage,
      cli: PLAYWRIGHT_LANE.cliPackage,
      mcp: PLAYWRIGHT_LANE.mcpPackage,
    },
    mcp: {
      configured: Boolean(configuredMcpUrl()),
      url: configuredMcpUrl() ?? PLAYWRIGHT_LANE.defaultMcpUrl,
      startCommand: PLAYWRIGHT_LANE.startCommand,
    },
    cli: {
      enabled: cliEnabled(),
      command: PLAYWRIGHT_LANE.cliCommand,
    },
    chromium: {
      executablePath,
      installed: existsSync(executablePath),
      installCommand: PLAYWRIGHT_LANE.installBrowserCommand,
    },
    roles: {
      mcp: ["explore", "regression", "self-healing-qa", "visual-review"],
      cli: ["repair-loop", "high-throughput-agent", "test-generation"],
      test: ["deterministic-regression", "release-gate", "ci"],
    },
  };
}

export async function playwrightMcpHealth(input: { live?: boolean } = {}) {
  const status = playwrightLaneStatus();
  if (!input.live) return { ...status, liveChecked: false };
  const url = configuredMcpUrl();
  if (!url) {
    return { ...status, liveChecked: true, reachable: false, reason: "GAME_SHOP_PLAYWRIGHT_MCP_URL is not configured." };
  }
  const init = await mcpInitialize({ url, timeoutMs: 8000 });
  const listed = await mcpListTools({ url, sessionId: init.sessionId, timeoutMs: 8000 });
  return {
    ...status,
    liveChecked: true,
    reachable: true,
    sessionId: listed.sessionId ?? init.sessionId,
    toolCount: listed.tools.length,
    tools: listed.tools.map((tool) => tool.name),
  };
}

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { mcpInitialize } from "./mcp-http-client.js";

export const LOCAL_PLAYWRIGHT_DEFAULT_URL = "http://localhost:8931/mcp";
const LOCAL_PLAYWRIGHT_PORT = 8931;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLoopbackPlaywrightUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function localBrowserAutonomyEnabled() {
  if (process.env.GAME_SHOP_LOCAL_BROWSER_AUTONOMY === "false") return false;
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") return false;
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) return false;
  return true;
}

export function localBrowserEndpoint() {
  const configured = process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL?.trim();
  if (configured) return configured;
  return localBrowserAutonomyEnabled() ? LOCAL_PLAYWRIGHT_DEFAULT_URL : undefined;
}

async function reachable(url: string) {
  try {
    await mcpInitialize({ url, timeoutMs: 1500 });
    return true;
  } catch {
    return false;
  }
}

export async function localBrowserAutonomyStatus() {
  const endpoint = localBrowserEndpoint();
  const executablePath = chromium.executablePath();
  const chromiumInstalled = existsSync(executablePath);
  const loopback = Boolean(endpoint && isLoopbackPlaywrightUrl(endpoint));
  const endpointReachable = endpoint ? await reachable(endpoint) : false;
  return {
    mode: "local-browser-autonomy",
    enabled: localBrowserAutonomyEnabled(),
    endpoint,
    loopback,
    reachable: endpointReachable,
    chromium: {
      installed: chromiumInstalled,
      executablePath,
      installCommand: "npm run setup:playwright",
    },
    managedStart: {
      supported: localBrowserAutonomyEnabled() && loopback,
      command: "npm run playwright:mcp",
      automatic: true,
    },
  };
}

export async function ensureLocalBrowserAutonomy(input: { startIfNeeded?: boolean } = {}) {
  const startIfNeeded = input.startIfNeeded !== false;
  const endpoint = localBrowserEndpoint();
  if (!endpoint) {
    return {
      ready: false,
      started: false,
      reason: "No Playwright MCP endpoint is configured and local browser autonomy is unavailable in this runtime.",
    };
  }

  if (await reachable(endpoint)) {
    return { ready: true, started: false, endpoint, reason: "Playwright MCP is already reachable." };
  }

  if (!startIfNeeded) {
    return { ready: false, started: false, endpoint, reason: "Playwright MCP is not reachable." };
  }

  if (!localBrowserAutonomyEnabled()) {
    return {
      ready: false,
      started: false,
      endpoint,
      reason: "Automatic local browser startup is disabled in this runtime.",
    };
  }

  if (!isLoopbackPlaywrightUrl(endpoint)) {
    return {
      ready: false,
      started: false,
      endpoint,
      reason: "Game Shop will only auto-start Playwright MCP for a loopback endpoint.",
    };
  }

  const executablePath = chromium.executablePath();
  if (!existsSync(executablePath)) {
    return {
      ready: false,
      started: false,
      endpoint,
      reason: "Chromium is not installed for Playwright.",
      installCommand: "npm run setup:playwright",
    };
  }

  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(
    command,
    [
      "--yes",
      "@playwright/mcp@0.0.80",
      "--headless",
      "--caps=network,testing,devtools",
      "--port",
      String(LOCAL_PLAYWRIGHT_PORT),
    ],
    {
      detached: true,
      stdio: "ignore",
      env: process.env,
    },
  );
  child.unref();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(250);
    if (await reachable(endpoint)) {
      return {
        ready: true,
        started: true,
        endpoint,
        pid: child.pid,
        reason: "Game Shop started the local Playwright MCP browser lane.",
      };
    }
  }

  return {
    ready: false,
    started: true,
    endpoint,
    pid: child.pid,
    reason: "Playwright MCP was spawned but did not become reachable before the startup timeout.",
  };
}

import assert from "node:assert/strict";
import {
  LOCAL_PLAYWRIGHT_DEFAULT_URL,
  isLoopbackPlaywrightUrl,
  localBrowserAutonomyEnabled,
  localBrowserEndpoint,
} from "../src/local-browser-autonomy.js";

assert.equal(isLoopbackPlaywrightUrl("http://localhost:8931/mcp"), true);
assert.equal(isLoopbackPlaywrightUrl("http://127.0.0.1:8931/mcp"), true);
assert.equal(isLoopbackPlaywrightUrl("https://example.com/mcp"), false);
assert.equal(LOCAL_PLAYWRIGHT_DEFAULT_URL, "http://localhost:8931/mcp");

const previous = {
  ci: process.env.CI,
  github: process.env.GITHUB_ACTIONS,
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
  autonomy: process.env.GAME_SHOP_LOCAL_BROWSER_AUTONOMY,
  endpoint: process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL,
};

try {
  delete process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL;
  process.env.CI = "true";
  assert.equal(localBrowserAutonomyEnabled(), false);
  assert.equal(localBrowserEndpoint(), undefined);

  process.env.CI = "false";
  delete process.env.GITHUB_ACTIONS;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.GAME_SHOP_LOCAL_BROWSER_AUTONOMY;
  assert.equal(localBrowserAutonomyEnabled(), true);
  assert.equal(localBrowserEndpoint(), LOCAL_PLAYWRIGHT_DEFAULT_URL);

  process.env.GAME_SHOP_LOCAL_BROWSER_AUTONOMY = "false";
  assert.equal(localBrowserAutonomyEnabled(), false);
  assert.equal(localBrowserEndpoint(), undefined);

  process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL = "https://browser.example.test/mcp";
  assert.equal(localBrowserEndpoint(), "https://browser.example.test/mcp");
} finally {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore("CI", previous.ci);
  restore("GITHUB_ACTIONS", previous.github);
  restore("VERCEL", previous.vercel);
  restore("VERCEL_ENV", previous.vercelEnv);
  restore("GAME_SHOP_LOCAL_BROWSER_AUTONOMY", previous.autonomy);
  restore("GAME_SHOP_PLAYWRIGHT_MCP_URL", previous.endpoint);
}

console.log("Local browser autonomy smoke OK: loopback-only auto-start policy and runtime gating verified.");

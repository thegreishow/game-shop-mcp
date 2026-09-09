import assert from "node:assert/strict";
import { POST } from "../api/server.js";

function payloadFrom(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const data = trimmed.split("\n").filter((line) => line.startsWith("data:"));
  if (!data.length) throw new Error(`Unexpected MCP response: ${trimmed.slice(0, 200)}`);
  return JSON.parse(data.at(-1)!.slice(5).trim());
}

async function rpc(body: unknown, session?: string) {
  const headers: Record<string, string> = {
    authorization: "Bearer smoke-token",
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  if (session) headers["mcp-session-id"] = session;
  const response = await POST(new Request("http://localhost/mcp", { method: "POST", headers, body: JSON.stringify(body) }));
  return { response, body: payloadFrom(await response.text()) };
}

async function main() {
  process.env.NODE_ENV = "production";
  delete process.env.GAME_SHOP_MCP_TOKEN;
  const closed = await POST(new Request("http://localhost/mcp", { method: "POST", body: "{}" }));
  assert.equal(closed.status, 503, "production gateway must fail closed without GAME_SHOP_MCP_TOKEN");

  process.env.GAME_SHOP_MCP_TOKEN = "smoke-token";
  delete process.env.GAME_SHOP_ALLOW_PAID_GENERATION;

  const initialized = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "game-shop-smoke", version: "1.0.0" } } });
  assert.equal(initialized.response.status, 200);
  assert.ok(initialized.body?.result, "initialize must return an MCP result");
  const session = initialized.response.headers.get("mcp-session-id") ?? undefined;

  const initializedNotification = await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }, session);
  assert.ok([200, 202, 204].includes(initializedNotification.response.status), "initialized notification should be accepted");

  const listed = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, session);
  const tools = listed.body?.result?.tools ?? [];
  const names = new Set(tools.map((tool: { name: string }) => tool.name));
  for (const required of ["gameshop_spend_policy", "gameshop_plan_build", "gameshop_project_context", "gameshop_github_read_file", "gameshop_github_upsert_file"]) {
    assert.ok(names.has(required), `missing MCP tool: ${required}`);
  }

  const spend = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "gameshop_spend_policy", arguments: {} } }, session);
  assert.equal(spend.body?.result?.structuredContent?.allowPaidGeneration, false, "paid generation must be off by default");

  const blocked = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "gameshop_generate_character", arguments: { name: "smoke", prompt: "smoke test" } } }, session);
  assert.equal(blocked.body?.result?.isError, true, "paid generation tool must be blocked without opt-in");
  assert.match(blocked.body?.result?.content?.[0]?.text ?? "", /Paid generation is disabled/);

  console.log(`MCP smoke OK: ${tools.length} tools; auth fail-closed and spend lock verified.`);
}

main().catch((error) => { console.error(error); process.exit(1); });

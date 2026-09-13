import { integrationRegistry, integrationStatus, type Integration } from "./integrations.js";
import { assertPaidGenerationAllowed } from "./spend.js";
import { integrationOperationPolicyInfo, resolveIntegrationOperation } from "./integration-policy.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_CHARS = 250_000;
const MCP_PROTOCOL_PREFERENCE=["2026-07-28","2025-11-25","2025-03-26"] as const;

export type IntegrationInvokeInput = {
  id: string;
  mode?: "mcp-list-tools" | "mcp-call" | "api";
  tool?: string;
  arguments?: Record<string, unknown>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
  body?: unknown;
  timeoutMs?: number;
};

export type IntegrationStep = IntegrationInvokeInput & { optional?: boolean };

function externalAllowed() {
  return process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true";
}

function configuredEnv(integration: Integration) {
  return (integration.env ?? []).map((name) => ({ name, configured: Boolean(process.env[name]) }));
}

function endpointMode(integration: Integration) {
  if (integration.kinds.includes("mcp") && integration.endpoint) return "remote-mcp";
  if (integration.kinds.includes("api") && integration.endpoint) return "rest-api";
  if (integration.kinds.includes("desktop-mcp")) return "desktop-mcp";
  if (integration.kinds.includes("mcp")) return "stdio-mcp";
  if (integration.kinds.includes("library")) return "library";
  if (integration.kinds.includes("platform-api")) return "platform-api";
  if (integration.kinds.includes("registry") || integration.kinds.includes("cli")) return "installable";
  return "reference";
}

export function integrationReadiness(id?: string) {
  const found = id ? integrationStatus(id) : null;
  const items: Integration[] = id ? (found && !Array.isArray(found) ? [found] : []) : integrationRegistry();
  return items.map((integration) => {
    const env = configuredEnv(integration);
    const mode = endpointMode(integration);
    const authReady = env.length === 0 || env.every((entry) => entry.configured);
    const remotelyCallable = (mode === "remote-mcp" || mode === "rest-api") && authReady;
    return {
      id: integration.id,
      name: integration.name,
      mode,
      state: integration.state,
      endpoint: integration.endpoint ?? null,
      install: integration.install ?? null,
      env,
      authReady,
      externallyEnabled: externalAllowed(),
      remotelyCallable,
      callableNow: remotelyCallable && externalAllowed(),
      capabilities: integration.capabilities,
      note: remotelyCallable
        ? (externalAllowed() ? "Ready for policy-allowlisted live Game Shop invocation." : "Credentials are available, but live external calls are locked by GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS.")
        : mode === "desktop-mcp" || mode === "stdio-mcp"
          ? "Requires a local/desktop MCP host; the cloud Game Shop runtime cannot spawn it."
          : mode === "library" || mode === "platform-api" || mode === "installable"
            ? "Project-side capability: Game Shop can plan/install/use it through controlled project edits, not remote HTTP invocation."
            : "Reference-only; no callable contract is registered.",
    };
  });
}

function tokenFor(integration: Integration) {
  const first = integration.env?.find((name) => process.env[name]);
  return first ? process.env[first] : undefined;
}

function authHeaders(integration: Integration): Record<string, string> {
  const token = tokenFor(integration);
  if (!token) return {};
  switch (integration.id) {
    case "ludo-ai": return { Authorization: `ApiKey ${token}` };
    case "elevenlabs": return { "xi-api-key": token };
    case "fal-ai": return { Authorization: `Key ${token}` };
    default: return { Authorization: `Bearer ${token}` };
  }
}

function assertCallable(integration: Integration) {
  if (!externalAllowed()) throw new Error("External integrations are disabled. Set GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true to permit live MCP/API calls.");
  if (!integration.endpoint) throw new Error(`${integration.name} has no remote endpoint registered.`);
  const missing = configuredEnv(integration).filter((entry) => !entry.configured).map((entry) => entry.name);
  if (missing.length) throw new Error(`${integration.name} is missing required environment configuration: ${missing.join(", ")}.`);
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  const clipped = text.length > MAX_RESPONSE_CHARS ? `${text.slice(0, MAX_RESPONSE_CHARS)}\n…[truncated]` : text;
  let data: unknown = clipped;
  try { data = clipped ? JSON.parse(clipped) : null; } catch {}
  if (!response.ok) throw new Error(`Integration request failed with HTTP ${response.status}.`);
  return { status: response.status, headers: Object.fromEntries([...response.headers.entries()].filter(([key]) => !/authorization|cookie|token|key/i.test(key))), data };
}

async function mcpRpc(integration: Integration, method: string, params: unknown, session?: string, id = 1, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers: Record<string, string> = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    ...authHeaders(integration),
  };
  if (session) headers["mcp-session-id"] = session;
  const response = await fetch(integration.endpoint!, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const nextSession = response.headers.get("mcp-session-id") ?? session;
  const text = await response.text();
  if (!response.ok) throw new Error(`${integration.name} MCP returned HTTP ${response.status}.`);
  let payload: any = null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) payload = JSON.parse(trimmed);
  else {
    const dataLines = trimmed.split("\n").filter((line) => line.startsWith("data:"));
    if (dataLines.length) payload = JSON.parse(dataLines.at(-1)!.slice(5).trim());
  }
  if (!payload) throw new Error(`${integration.name} returned an unreadable MCP response.`);
  if (payload.error) throw new Error(`${integration.name} MCP call failed: ${String(payload.error?.message??"unknown error")}`);
  return { payload, session: nextSession };
}

async function initializeMcp(integration: Integration, timeoutMs: number) {
  let lastError:unknown=null;
  for(const requestedVersion of MCP_PROTOCOL_PREFERENCE){
    try{
      const init = await mcpRpc(integration, "initialize", { protocolVersion: requestedVersion, capabilities: {}, clientInfo: { name: "game-shop-mcp", version: "0.4.0" } }, undefined, 1, timeoutMs);
      const negotiated=String(init.payload?.result?.protocolVersion??requestedVersion);
      if (init.session) {
        const headers: Record<string, string> = { accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-session-id": init.session, ...authHeaders(integration) };
        await fetch(integration.endpoint!, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }), signal: AbortSignal.timeout(timeoutMs) });
      }
      return{session:init.session,protocolVersion:negotiated,requestedVersion};
    }catch(error){lastError=error;}
  }
  throw lastError instanceof Error?lastError:new Error(`${integration.name} MCP initialization failed.`);
}

export async function invokeIntegration(input: IntegrationInvokeInput) {
  const found = integrationStatus(input.id);
  const integration = found && !Array.isArray(found) ? found : null;
  if (!integration) throw new Error(`Unknown integration: ${input.id}.`);
  assertCallable(integration);
  const timeoutMs = Math.max(1_000, Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, 60_000));
  const mode = input.mode ?? (integration.kinds.includes("mcp") ? "mcp-list-tools" : "api");
  const method = input.method ?? "GET";
  const operation = resolveIntegrationOperation({ integrationId: integration.id, mode, method, path: input.path, tool: input.tool });
  if (operation.billing !== "free") assertPaidGenerationAllowed(`integration.${integration.id}.${operation.operation}`);

  if (mode === "mcp-list-tools" || mode === "mcp-call") {
    if (!integration.kinds.includes("mcp")) throw new Error(`${integration.name} is not registered as a remote MCP integration.`);
    const initialized = await initializeMcp(integration, timeoutMs);
    if (mode === "mcp-list-tools") {
      const listed = await mcpRpc(integration, "tools/list", {}, initialized.session, 2, timeoutMs);
      return { integration: integration.id, mode, operation: operation.operation, billing: operation.billing, mutation: operation.mutation, protocolVersion:initialized.protocolVersion, result: listed.payload.result };
    }
    if (!input.tool) throw new Error("tool is required for mcp-call.");
    const called = await mcpRpc(integration, "tools/call", { name: input.tool, arguments: input.arguments ?? {} }, initialized.session, 2, timeoutMs);
    return { integration: integration.id, mode, operation: operation.operation, billing: operation.billing, mutation: operation.mutation, protocolVersion:initialized.protocolVersion, tool: input.tool, result: called.payload.result };
  }

  if (!integration.kinds.includes("api")) throw new Error(`${integration.name} is not registered as a REST API integration.`);
  const path = input.path ?? "";
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.includes("..")) throw new Error("API path must be relative to the registered integration endpoint.");
  const url = new URL(path.replace(/^\//, ""), integration.endpoint!.endsWith("/") ? integration.endpoint! : `${integration.endpoint!}/`).toString();
  const headers: Record<string, string> = { accept: "application/json", ...authHeaders(integration) };
  if (input.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetchJson(url, { method, headers, body: input.body === undefined ? undefined : JSON.stringify(input.body) }, timeoutMs);
  return { integration: integration.id, mode, operation: operation.operation, billing: operation.billing, mutation: operation.mutation, method, path, response };
}

export async function orchestrateIntegrations(steps: IntegrationStep[]) {
  if (!steps.length || steps.length > 10) throw new Error("Integration orchestration requires 1 to 10 steps.");
  const results: unknown[] = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    try {
      results.push({ index, ok: true, result: await invokeIntegration(step) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ index, ok: false, error: message });
      if (!step.optional) return { completed: false, stoppedAt: index, results };
    }
  }
  return { completed: true, results };
}

export function integrationRuntimeInfo(){return{externalExecutionEnabled:externalAllowed(),protocolPreference:MCP_PROTOCOL_PREFERENCE,operationPolicy:integrationOperationPolicyInfo(),maxResponseChars:MAX_RESPONSE_CHARS,defaultTimeoutMs:DEFAULT_TIMEOUT_MS};}

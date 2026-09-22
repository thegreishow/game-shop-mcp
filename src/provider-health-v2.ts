import { integrationRegistry, type Integration } from "./integrations.js";
import { SDK_PROVIDERS, sdkProviderConfigured, type SdkProviderId } from "./sdk-hub.js";

export type ProviderHealthState =
  | "ready"
  | "configured"
  | "auth-needed"
  | "deferred"
  | "local-runtime"
  | "vendor-blocked"
  | "research";

export type ProviderBlocker = {
  code: string;
  state: ProviderHealthState;
  detail: string;
  retryable: boolean;
};

const KNOWN_BLOCKERS: Record<string, ProviderBlocker> = {
  replicate: {
    code: "replicate-auth-deferred",
    state: "deferred",
    detail: "Credential is present locally but read-only account verification has failed. Keep adapter installed but do not route paid work here until auth is re-verified.",
    retryable: true,
  },
  "kibo-ui": {
    code: "kibo-provider-http-500",
    state: "vendor-blocked",
    detail: "Official MCP Streamable HTTP POST handshake returned provider HTTP 500. No local workaround is trusted.",
    retryable: true,
  },
  contextcore: {
    code: "contextcore-local-runtime",
    state: "local-runtime",
    detail: "Local backend is separate from hosted Game Shop. MCP v1 compatibility repair was applied; each machine must verify its local stdio wrapper.",
    retryable: true,
  },
  "spline-mcp": {
    code: "spline-desktop-required",
    state: "local-runtime",
    detail: "Spline MCP requires the desktop application to be installed and running.",
    retryable: true,
  },
  wangp: {
    code: "wangp-local-model-runtime",
    state: "local-runtime",
    detail: "WanGP/Wan2GP is a heavy local model runtime and remains intentionally opt-in.",
    retryable: true,
  },
  scenario: {
    code: "scenario-auth-deferred",
    state: "deferred",
    detail: "SDK is installed; API use requires both SCENARIO_API_KEY and SCENARIO_API_SECRET and a compatible Scenario plan.",
    retryable: true,
  },
  "ludo-ai": {
    code: "ludo-auth-deferred",
    state: "deferred",
    detail: "Ludo API/MCP access is plan-dependent and no key is currently required for the main build path.",
    retryable: true,
  },
};

const SDK_TO_INTEGRATION: Record<SdkProviderId, string> = {
  replicate: "replicate",
  fal: "fal-ai",
  elevenlabs: "elevenlabs",
  scenario: "scenario",
  cloudinary: "cloudinary",
  podium: "podium",
};

function envConfigured(integration: Integration): boolean {
  if (!integration.env?.length) return integration.state === "ready" || integration.state === "installable";
  return integration.env.every((name) => {
    const value = process.env[name]?.trim();
    return Boolean(value && value !== "[SENSITIVE]" && value !== '""' && value !== "''");
  });
}

function healthScore(input: {
  state: ProviderHealthState;
  configured: boolean;
  adapterReady: boolean;
  vendorBlocked?: boolean;
  localRuntime?: boolean;
}) {
  let score = 100;
  if (!input.configured) score -= 35;
  if (!input.adapterReady) score -= 20;
  if (input.state === "deferred") score -= 25;
  if (input.state === "auth-needed") score -= 30;
  if (input.localRuntime) score -= 35;
  if (input.vendorBlocked) score = 0;
  if (input.state === "research") score = Math.min(score, 20);
  return Math.max(0, Math.min(100, score));
}

function stateFor(integration: Integration, configured: boolean, blocker?: ProviderBlocker): ProviderHealthState {
  if (blocker) return blocker.state;
  if (integration.state === "research") return "research";
  if (integration.state === "local-app-required") return "local-runtime";
  if (configured) return integration.state === "ready" ? "ready" : "configured";
  if (integration.state === "needs-auth") return "auth-needed";
  return "ready";
}

export function providerHealthSnapshot() {
  const sdkIds = new Set(Object.values(SDK_TO_INTEGRATION));
  return integrationRegistry().map((integration) => {
    const blocker = KNOWN_BLOCKERS[integration.id];
    const sdkEntry = (Object.keys(SDK_TO_INTEGRATION) as SdkProviderId[]).find(
      (id) => SDK_TO_INTEGRATION[id] === integration.id,
    );
    const configured = sdkEntry ? sdkProviderConfigured(sdkEntry) : envConfigured(integration);
    const adapterReady = Boolean(sdkEntry) || ["autosprite", "spritecook", "meshy", "ludo-ai"].includes(integration.id);
    const state = stateFor(integration, configured, blocker);
    const score = healthScore({
      state,
      configured,
      adapterReady,
      vendorBlocked: state === "vendor-blocked",
      localRuntime: state === "local-runtime",
    });
    return {
      id: integration.id,
      name: integration.name,
      state,
      score,
      configured,
      adapterReady,
      sdk: sdkEntry ? SDK_PROVIDERS[sdkEntry] : null,
      kinds: integration.kinds,
      domains: integration.domains,
      capabilities: integration.capabilities,
      endpoint: integration.endpoint ?? null,
      auth: integration.auth ?? null,
      blocker: blocker ?? null,
      isSdkPhase2Provider: sdkIds.has(integration.id),
    };
  });
}

export function providerHealth(id: string) {
  return providerHealthSnapshot().find((provider) => provider.id === id) ?? null;
}

export type ProviderRouteEvidence={reachable?:boolean;tested?:boolean;latencyMs?:number;estimatedCostUsd?:number;compatible?:boolean};
export function rankHealthyProviders(capability:string,ids?:string[],evidence:Record<string,ProviderRouteEvidence>={}){
 return providerHealthSnapshot().filter(provider=>{const e=evidence[provider.id];return(!ids||ids.includes(provider.id))&&provider.capabilities.includes(capability)&&provider.configured&&provider.state!=="vendor-blocked"&&provider.state!=="auth-needed"&&e?.compatible!==false&&e?.reachable!==false;}).map(provider=>{const e=evidence[provider.id]??{};const verified=e.tested===true;const latencyPenalty=Math.min(20,Math.max(0,(e.latencyMs??0)/500));const costPenalty=Math.min(20,Math.max(0,(e.estimatedCostUsd??0)*10));return{...provider,routeEvidence:{configured:provider.configured,authenticated:provider.configured&&provider.state!=="auth-needed",reachable:e.reachable??null,tested:e.tested??null,latencyMs:e.latencyMs??null,estimatedCostUsd:e.estimatedCostUsd??null},routeScore:provider.score+(verified?15:0)-latencyPenalty-costPenalty};}).sort((a,b)=>b.routeScore-a.routeScore);
}

export function providerHealthSummary() {
  const rows = providerHealthSnapshot();
  return {
    total: rows.length,
    readyOrConfigured: rows.filter((row) => row.state === "ready" || row.state === "configured").length,
    deferred: rows.filter((row) => row.state === "deferred").length,
    vendorBlocked: rows.filter((row) => row.state === "vendor-blocked").length,
    localRuntime: rows.filter((row) => row.state === "local-runtime").length,
    authNeeded: rows.filter((row) => row.state === "auth-needed").length,
    rows,
  };
}

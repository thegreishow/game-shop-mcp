import { assertPaidGenerationAllowed } from "./spend.js";

export type SdkProviderId = "replicate" | "fal" | "elevenlabs" | "scenario" | "cloudinary" | "podium";

export type SdkCapability =
  | "model-inference"
  | "image-generation"
  | "video-generation"
  | "audio-generation"
  | "speech-generation"
  | "3d-generation"
  | "upscaling"
  | "asset-upload"
  | "asset-management"
  | "image-transform"
  | "video-transform"
  | "media-delivery"
  | "commerce-search"
  | "commerce-catalog"
  | "commerce-orders"
  | "agentic-checkout"
  | "agent-memory"
  | "subscriptions"
  | "machine-payments";

export type SdkProviderDefinition = {
  id: SdkProviderId;
  packageName: string;
  version: string;
  install: string;
  env: readonly string[];
  apiBase: string;
  authScheme: string;
  capabilities: readonly SdkCapability[];
  generationProvider: boolean;
  notes: string;
};

export const SDK_PROVIDERS: Record<SdkProviderId, SdkProviderDefinition> = {
  replicate: {
    id: "replicate",
    packageName: "replicate",
    version: "^1.4.0",
    install: "npm install replicate",
    env: ["REPLICATE_API_TOKEN"],
    apiBase: "https://api.replicate.com/v1",
    authScheme: "API token; official SDK uses auth option and HTTP API uses bearer/token authentication depending on client surface.",
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    generationProvider: true,
    notes: "Official Replicate JavaScript client. Installed even while account-token verification is deferred so routing metadata remains portable.",
  },
  fal: {
    id: "fal",
    packageName: "@fal-ai/client",
    version: "^1.10.1",
    install: "npm install @fal-ai/client",
    env: ["FAL_KEY"],
    apiBase: "https://queue.fal.run",
    authScheme: "FAL_KEY; queue REST uses Authorization: Key <credential>; official SDK supports fal.config({ credentials }).",
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    generationProvider: true,
    notes: "Official fal JavaScript client with queue, subscribe, upload and inference helpers.",
  },
  elevenlabs: {
    id: "elevenlabs",
    packageName: "@elevenlabs/elevenlabs-js",
    version: "^2.68.0",
    install: "npm install @elevenlabs/elevenlabs-js",
    env: ["ELEVENLABS_API_KEY"],
    apiBase: "https://api.elevenlabs.io/v1",
    authScheme: "xi-api-key header or ElevenLabsClient({ apiKey }). Server-side only.",
    capabilities: ["speech-generation", "audio-generation", "image-generation", "video-generation"],
    generationProvider: true,
    notes: "Official ElevenLabs Node SDK. Keep API keys server-side; browser/client SDKs require separate scoped-token patterns.",
  },
  scenario: {
    id: "scenario",
    packageName: "@scenario-labs/sdk",
    version: "^3.1.0",
    install: "npm install @scenario-labs/sdk",
    env: ["SCENARIO_API_KEY", "SCENARIO_API_SECRET"],
    apiBase: "https://api.cloud.scenario.com/v1",
    authScheme: "Scenario API key + API secret through the official server-side SDK.",
    capabilities: ["image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling", "asset-management"],
    generationProvider: true,
    notes: "Official Scenario TypeScript SDK. API access remains deferred until both key and secret are configured on a compatible plan.",
  },
  cloudinary: {
    id: "cloudinary",
    packageName: "cloudinary",
    version: "^2.11.0",
    install: "npm install cloudinary",
    env: ["CLOUDINARY_URL"],
    apiBase: "https://api.cloudinary.com",
    authScheme: "CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>; credentials must remain server-side.",
    capabilities: ["asset-upload", "asset-management", "image-transform", "video-transform", "media-delivery"],
    generationProvider: false,
    notes: "Official Cloudinary Node SDK for artifact upload, transformation, optimization and delivery.",
  },
  podium: {
    id: "podium",
    packageName: "@podium-sdk/node-sdk",
    version: "^0.5.0",
    install: "npm install @podium-sdk/node-sdk",
    env: ["PODIUM_API_KEY"],
    apiBase: "https://api.podium.build/api/v1",
    authScheme: "PODIUM_API_KEY; official SDK uses createPodiumClient({ apiKey }). podium_test_ routes to staging and podium_live_ routes to production.",
    capabilities: ["commerce-search", "commerce-catalog", "commerce-orders", "agentic-checkout", "agent-memory", "subscriptions", "machine-payments"],
    generationProvider: false,
    notes: "Official Podium TypeScript SDK for agentic commerce, catalog/search, durable agent context, checkout, subscriptions and machine payments.",
  },
};

const ROUTE_PRIORITY: Record<SdkCapability, readonly SdkProviderId[]> = {
  "model-inference": ["fal", "replicate"],
  "image-generation": ["fal", "scenario", "replicate", "elevenlabs"],
  "video-generation": ["fal", "scenario", "replicate", "elevenlabs"],
  "audio-generation": ["elevenlabs", "fal", "scenario", "replicate"],
  "speech-generation": ["elevenlabs"],
  "3d-generation": ["scenario", "fal", "replicate"],
  upscaling: ["replicate", "fal", "scenario"],
  "asset-upload": ["cloudinary"],
  "asset-management": ["cloudinary", "scenario"],
  "image-transform": ["cloudinary"],
  "video-transform": ["cloudinary"],
  "media-delivery": ["cloudinary"],
  "commerce-search": ["podium"],
  "commerce-catalog": ["podium"],
  "commerce-orders": ["podium"],
  "agentic-checkout": ["podium"],
  "agent-memory": ["podium"],
  subscriptions: ["podium"],
  "machine-payments": ["podium"],
};

function configuredEnv(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value && value !== "[SENSITIVE]" && value !== '""' && value !== "''");
}

export function sdkProviderConfigured(provider: SdkProviderId): boolean {
  return SDK_PROVIDERS[provider].env.every(configuredEnv);
}

export function sdkHubStatus() {
  return Object.values(SDK_PROVIDERS).map((provider) => ({
    id: provider.id,
    packageName: provider.packageName,
    version: provider.version,
    install: provider.install,
    configured: sdkProviderConfigured(provider.id),
    requiredEnv: [...provider.env],
    apiBase: provider.apiBase,
    authScheme: provider.authScheme,
    capabilities: [...provider.capabilities],
    generationProvider: provider.generationProvider,
    notes: provider.notes,
  }));
}

export function sdkRoutingPriority() {
  return ROUTE_PRIORITY;
}

export function routeSdkCapability(
  capability: SdkCapability,
  options: { preferred?: SdkProviderId; requireConfigured?: boolean } = {},
): SdkProviderId | null {
  const requireConfigured = options.requireConfigured ?? true;
  const candidates = [...ROUTE_PRIORITY[capability]];
  if (options.preferred && candidates.includes(options.preferred)) {
    candidates.splice(candidates.indexOf(options.preferred), 1);
    candidates.unshift(options.preferred);
  }
  return candidates.find((id) => !requireConfigured || sdkProviderConfigured(id)) ?? null;
}

const lazyModules = new Map<SdkProviderId, Promise<Record<string, unknown>>>();
const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;

export function loadSdkModule(provider: SdkProviderId): Promise<Record<string, unknown>> {
  const existing = lazyModules.get(provider);
  if (existing) return existing;
  const pending = dynamicImport(SDK_PROVIDERS[provider].packageName).catch((error) => {
    lazyModules.delete(provider);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`SDK package ${SDK_PROVIDERS[provider].packageName} is not installed or failed to load: ${message}`);
  });
  lazyModules.set(provider, pending);
  return pending;
}

function requiredSecret(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value === "[SENSITIVE]") throw new Error(`${name} is not configured.`);
  return value;
}

type Constructor = new (options?: Record<string, unknown>) => unknown;

export async function createSdkClient(provider: SdkProviderId): Promise<unknown> {
  const mod = await loadSdkModule(provider);

  if (provider === "replicate") {
    const Replicate = (mod.default ?? mod.Replicate) as Constructor | undefined;
    if (typeof Replicate !== "function") throw new Error("Replicate SDK constructor was not found.");
    return new Replicate({ auth: requiredSecret("REPLICATE_API_TOKEN") });
  }

  if (provider === "fal") {
    const fal = mod.fal as { config?: (options: { credentials: string }) => void } | undefined;
    if (!fal || typeof fal.config !== "function") throw new Error("fal SDK client was not found.");
    fal.config({ credentials: requiredSecret("FAL_KEY") });
    return fal;
  }

  if (provider === "elevenlabs") {
    const ElevenLabsClient = mod.ElevenLabsClient as Constructor | undefined;
    if (typeof ElevenLabsClient !== "function") throw new Error("ElevenLabsClient was not found.");
    return new ElevenLabsClient({ apiKey: requiredSecret("ELEVENLABS_API_KEY") });
  }

  if (provider === "scenario") {
    const Scenario = (mod.default ?? mod.Scenario) as Constructor | undefined;
    if (typeof Scenario !== "function") throw new Error("Scenario SDK constructor was not found.");
    return new Scenario({
      apiKey: requiredSecret("SCENARIO_API_KEY"),
      apiSecret: requiredSecret("SCENARIO_API_SECRET"),
    });
  }

  if (provider === "podium") {
    const createPodiumClient = mod.createPodiumClient as ((options: { apiKey: string }) => unknown) | undefined;
    if (typeof createPodiumClient !== "function") throw new Error("Podium createPodiumClient export was not found.");
    return createPodiumClient({ apiKey: requiredSecret("PODIUM_API_KEY") });
  }

  const cloudinary = (mod.v2 ?? (mod.default as { v2?: unknown } | undefined)?.v2) as
    | { config?: (options: Record<string, unknown>) => void }
    | undefined;
  if (!cloudinary || typeof cloudinary.config !== "function") throw new Error("Cloudinary v2 SDK client was not found.");
  const parsed = new URL(requiredSecret("CLOUDINARY_URL"));
  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
    secure: true,
  });
  return cloudinary;
}

export async function executeSdkRead<T>(provider: SdkProviderId, invoke: (client: unknown) => Promise<T>): Promise<T> {
  const client = await createSdkClient(provider);
  return invoke(client);
}

export async function executeSdkGeneration<T>(
  provider: Exclude<SdkProviderId, "cloudinary" | "podium">,
  action: string,
  invoke: (client: unknown) => Promise<T>,
): Promise<T> {
  const client = await createSdkClient(provider);
  assertPaidGenerationAllowed(`SDK ${provider}: ${action}`);
  return invoke(client);
}

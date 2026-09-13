import { assertPaidGenerationAllowed } from "./spend.js";

export type SdkProviderId = "replicate" | "fal" | "elevenlabs" | "scenario" | "cloudinary";

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
  | "media-delivery";

export type SdkProviderDefinition = {
  id: SdkProviderId;
  packageName: string;
  env: readonly string[];
  capabilities: readonly SdkCapability[];
  generationProvider: boolean;
  notes: string;
};

export const SDK_PROVIDERS: Record<SdkProviderId, SdkProviderDefinition> = {
  replicate: {
    id: "replicate",
    packageName: "replicate",
    env: ["REPLICATE_API_TOKEN"],
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    generationProvider: true,
    notes: "Official Replicate JavaScript client. Authentication remains provider-dependent; SDK loading is independent of auth readiness.",
  },
  fal: {
    id: "fal",
    packageName: "@fal-ai/client",
    env: ["FAL_KEY"],
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    generationProvider: true,
    notes: "Official fal JavaScript client with queue and file helpers.",
  },
  elevenlabs: {
    id: "elevenlabs",
    packageName: "@elevenlabs/elevenlabs-js",
    env: ["ELEVENLABS_API_KEY"],
    capabilities: ["speech-generation", "audio-generation", "image-generation", "video-generation"],
    generationProvider: true,
    notes: "Official ElevenLabs Node SDK. Server-side only; never expose ELEVENLABS_API_KEY to browser clients.",
  },
  scenario: {
    id: "scenario",
    packageName: "@scenario-labs/sdk",
    env: ["SCENARIO_API_KEY", "SCENARIO_API_SECRET"],
    capabilities: ["image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling", "asset-management"],
    generationProvider: true,
    notes: "Official Scenario TypeScript SDK. API access remains deferred until both key and secret are configured.",
  },
  cloudinary: {
    id: "cloudinary",
    packageName: "cloudinary",
    env: ["CLOUDINARY_URL"],
    capabilities: ["asset-upload", "asset-management", "image-transform", "video-transform", "media-delivery"],
    generationProvider: false,
    notes: "Official Cloudinary Node SDK for artifact upload, transformation, optimization and delivery.",
  },
};

const ROUTE_PRIORITY: Record<SdkCapability, readonly SdkProviderId[]> = {
  "model-inference": ["fal", "replicate"],
  "image-generation": ["fal", "replicate", "scenario", "elevenlabs"],
  "video-generation": ["fal", "replicate", "scenario", "elevenlabs"],
  "audio-generation": ["elevenlabs", "fal", "replicate", "scenario"],
  "speech-generation": ["elevenlabs"],
  "3d-generation": ["scenario", "fal", "replicate"],
  upscaling: ["replicate", "fal", "scenario"],
  "asset-upload": ["cloudinary"],
  "asset-management": ["cloudinary", "scenario"],
  "image-transform": ["cloudinary"],
  "video-transform": ["cloudinary"],
  "media-delivery": ["cloudinary"],
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
    configured: sdkProviderConfigured(provider.id),
    requiredEnv: [...provider.env],
    capabilities: [...provider.capabilities],
    generationProvider: provider.generationProvider,
    notes: provider.notes,
  }));
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
  provider: Exclude<SdkProviderId, "cloudinary">,
  action: string,
  invoke: (client: unknown) => Promise<T>,
): Promise<T> {
  const client = await createSdkClient(provider);
  // Keep the spend lock immediately before the callback that performs the provider request.
  assertPaidGenerationAllowed(`SDK ${provider}: ${action}`);
  return invoke(client);
}

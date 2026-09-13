export type BackendAdapterId = "supabase" | "stripe" | "openai" | "clerk" | "igdb";

export type BackendAdapterDefinition = {
  id: BackendAdapterId;
  packageName: string;
  version: string;
  env: readonly string[];
  capabilities: readonly string[];
  notes: string;
};

export const BACKEND_ADAPTERS: Record<BackendAdapterId, BackendAdapterDefinition> = {
  supabase: {
    id: "supabase",
    packageName: "@supabase/supabase-js",
    version: "^2.116.0",
    env: ["GAME_SHOP_SUPABASE_URL", "GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY"],
    capabilities: ["postgres", "auth", "storage", "realtime", "functions"],
    notes: "Server-side Supabase client for Game Shop durable state and project infrastructure. Service-role credentials remain server-only.",
  },
  stripe: {
    id: "stripe",
    packageName: "stripe",
    version: "^22.6.2",
    env: ["STRIPE_SECRET_KEY"],
    capabilities: ["payments", "checkout", "billing", "subscriptions", "webhooks"],
    notes: "Server-side Stripe SDK. Read/write operations remain explicit and should be separately policy-gated before any mutation.",
  },
  openai: {
    id: "openai",
    packageName: "openai",
    version: "^7.15.0",
    env: ["OPENAI_API_KEY"],
    capabilities: ["model-inference", "responses", "embeddings", "tool-calling"],
    notes: "Optional direct OpenAI adapter. Core Game Shop orchestration remains provider-neutral.",
  },
  clerk: {
    id: "clerk",
    packageName: "@clerk/backend",
    version: "^3.17.2",
    env: ["CLERK_SECRET_KEY"],
    capabilities: ["authentication", "users", "organizations", "sessions", "backend-api"],
    notes: "Clerk backend client created with createClerkClient({ secretKey }). Secret key remains server-only.",
  },
  igdb: {
    id: "igdb",
    packageName: "igdb-api-node",
    version: "^6.0.5",
    env: ["IGDB_CLIENT_ID", "IGDB_ACCESS_TOKEN"],
    capabilities: ["game-metadata", "covers", "companies", "genres", "release-dates", "search"],
    notes: "IGDB Node wrapper using Twitch Client ID + App Access Token. Read-oriented metadata integration; token remains server-only.",
  },
};

function configuredEnv(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value && value !== "[SENSITIVE]" && value !== '""' && value !== "''");
}

export function backendAdapterConfigured(id: BackendAdapterId) {
  return BACKEND_ADAPTERS[id].env.every(configuredEnv);
}

export function backendAdapterStatus() {
  return Object.values(BACKEND_ADAPTERS).map((adapter) => ({
    ...adapter,
    env: [...adapter.env],
    capabilities: [...adapter.capabilities],
    configured: backendAdapterConfigured(adapter.id),
  }));
}

function requiredSecret(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value === "[SENSITIVE]") throw new Error(`${name} is not configured.`);
  return value;
}

export async function createBackendClient(id: BackendAdapterId): Promise<unknown> {
  if (id === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      requiredSecret("GAME_SHOP_SUPABASE_URL"),
      requiredSecret("GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    );
  }

  if (id === "stripe") {
    const Stripe = (await import("stripe")).default;
    return new Stripe(requiredSecret("STRIPE_SECRET_KEY"));
  }

  if (id === "openai") {
    const OpenAI = (await import("openai")).default;
    return new OpenAI({ apiKey: requiredSecret("OPENAI_API_KEY") });
  }

  if (id === "clerk") {
    const { createClerkClient } = await import("@clerk/backend");
    return createClerkClient({ secretKey: requiredSecret("CLERK_SECRET_KEY") });
  }

  const mod = await import("igdb-api-node");
  const igdb = mod.default as unknown as ((clientId?: string, accessToken?: string) => unknown);
  if (typeof igdb !== "function") throw new Error("IGDB SDK default export was not found.");
  return igdb(requiredSecret("IGDB_CLIENT_ID"), requiredSecret("IGDB_ACCESS_TOKEN"));
}

export async function executeBackendRead<T>(id: BackendAdapterId, invoke: (client: unknown) => Promise<T>): Promise<T> {
  const client = await createBackendClient(id);
  return invoke(client);
}

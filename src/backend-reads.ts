import { createBackendClient, type BackendAdapterId } from "./backend-adapters.js";

export type BackendReadOperation =
  | "supabase.storage.list-buckets"
  | "stripe.account.retrieve"
  | "stripe.products.list"
  | "openai.models.list"
  | "clerk.users.list"
  | "clerk.organizations.list"
  | "igdb.games.search"
  | "firebase.auth.list-users"
  | "firebase.firestore.list-collections";

const OPERATIONS: Record<BackendReadOperation, { adapter: BackendAdapterId; description: string; parameters: readonly string[] }> = {
  "supabase.storage.list-buckets": { adapter: "supabase", description: "List configured Supabase Storage buckets.", parameters: [] },
  "stripe.account.retrieve": { adapter: "stripe", description: "Retrieve the connected Stripe account metadata.", parameters: [] },
  "stripe.products.list": { adapter: "stripe", description: "List Stripe products with a bounded page size.", parameters: ["limit"] },
  "openai.models.list": { adapter: "openai", description: "List models visible to the configured OpenAI API key.", parameters: ["limit"] },
  "clerk.users.list": { adapter: "clerk", description: "List Clerk users with a bounded page size.", parameters: ["limit"] },
  "clerk.organizations.list": { adapter: "clerk", description: "List Clerk organizations with a bounded page size.", parameters: ["limit"] },
  "igdb.games.search": { adapter: "igdb", description: "Search IGDB game metadata by text query.", parameters: ["query", "limit"] },
  "firebase.auth.list-users": { adapter: "firebase-admin", description: "List Firebase Auth users with a bounded page size.", parameters: ["limit"] },
  "firebase.firestore.list-collections": { adapter: "firebase-admin", description: "List top-level Firestore collection identifiers only.", parameters: [] },
};

function boundedLimit(value: unknown, fallback = 10, max = 25) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
}

function externalReadsAllowed() {
  return process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true";
}

export function backendReadOperationCatalog() {
  return Object.entries(OPERATIONS).map(([operation, definition]) => ({ operation, ...definition, parameters: [...definition.parameters] }));
}

export async function executeBackendReadOperation(input: {
  operation: BackendReadOperation;
  query?: string;
  limit?: number;
  execute: true;
}) {
  if (!externalReadsAllowed()) {
    throw new Error("External backend reads are disabled. Set GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true to execute a provider read.");
  }

  const definition = OPERATIONS[input.operation];
  if (!definition) throw new Error(`Unsupported backend read operation: ${String(input.operation)}`);
  const client = await createBackendClient(definition.adapter) as any;
  const limit = boundedLimit(input.limit);

  if (input.operation === "supabase.storage.list-buckets") {
    const { data, error } = await client.storage.listBuckets();
    if (error) throw new Error(`Supabase read failed: ${error.message ?? "unknown error"}`);
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "stripe.account.retrieve") {
    const data = await client.accounts.retrieve();
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "stripe.products.list") {
    const data = await client.products.list({ limit });
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "openai.models.list") {
    const page = await client.models.list();
    const data = Array.isArray(page?.data) ? page.data.slice(0, limit) : page;
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "clerk.users.list") {
    const data = await client.users.getUserList({ limit });
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "clerk.organizations.list") {
    const data = await client.organizations.getOrganizationList({ limit });
    return { operation: input.operation, adapter: definition.adapter, data };
  }

  if (input.operation === "igdb.games.search") {
    const query = input.query?.trim();
    if (!query) throw new Error("IGDB game search requires a non-empty query.");
    const response = await client.fields(["id", "name", "slug", "first_release_date", "rating", "cover"]).search(query).limit(limit).request("/games");
    return { operation: input.operation, adapter: definition.adapter, data: response?.data ?? response };
  }

  if (input.operation === "firebase.auth.list-users") {
    const { getAuth } = await import("firebase-admin/auth");
    const data = await getAuth(client).listUsers(Math.min(limit, 25));
    return {
      operation: input.operation,
      adapter: definition.adapter,
      data: data.users.map((user) => ({ uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null, disabled: user.disabled })),
      pageToken: data.pageToken ?? null,
    };
  }

  const { getFirestore } = await import("firebase-admin/firestore");
  const collections = await getFirestore(client).listCollections();
  return { operation: input.operation, adapter: definition.adapter, data: collections.map((collection) => ({ id: collection.id })) };
}

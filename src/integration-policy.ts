export type BillingClass = "free" | "potentially-paid" | "paid";
export type MutationClass = "read" | "write" | "destructive";
export type IntegrationOperationPolicy = {
  integrationId: string;
  mode: "api" | "mcp-list-tools" | "mcp-call";
  operation: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: RegExp;
  tool?: string;
  billing: BillingClass;
  mutation: MutationClass;
};

/**
 * Explicit allowlist for the generic integration runtime.
 * Unknown operations are denied. Provider-specific adapters may implement
 * richer contracts separately, but they must retain their own spend/write locks.
 */
const OPERATIONS: IntegrationOperationPolicy[] = [
  // Discovery is read-only and does not create provider work.
  { integrationId: "*", mode: "mcp-list-tools", operation: "tools.list", billing: "free", mutation: "read" },

  // Known safe REST lookups used by Game Shop. Keep paths intentionally narrow.
  { integrationId: "motion-so", mode: "api", operation: "session.status", method: "GET", path: /^sessions\/[^/]+$/, billing: "free", mutation: "read" },
  { integrationId: "meshy", mode: "api", operation: "task.status", method: "GET", path: /^v2\/(?:text-to-3d|image-to-3d)\/[^/]+$/, billing: "free", mutation: "read" },
  { integrationId: "replicate", mode: "api", operation: "prediction.status", method: "GET", path: /^v1\/predictions\/[^/]+$/, billing: "free", mutation: "read" },

  // Paid creation operations. These still require GAME_SHOP_ALLOW_PAID_GENERATION=true.
  { integrationId: "motion-so", mode: "api", operation: "session.create", method: "POST", path: /^sessions\/?$/, billing: "paid", mutation: "write" },
  { integrationId: "replicate", mode: "api", operation: "prediction.create", method: "POST", path: /^v1\/predictions\/?$/, billing: "paid", mutation: "write" },

  // No DELETE operation is intentionally allowlisted in the generic runtime.
];

function normalizePath(value?: string) {
  return (value ?? "").replace(/^\/+/, "");
}

export function resolveIntegrationOperation(input: {
  integrationId: string;
  mode: "api" | "mcp-list-tools" | "mcp-call";
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
  tool?: string;
}) {
  const path = normalizePath(input.path);
  const match = OPERATIONS.find((policy) => {
    if (policy.integrationId !== "*" && policy.integrationId !== input.integrationId) return false;
    if (policy.mode !== input.mode) return false;
    if (policy.method && policy.method !== (input.method ?? "GET")) return false;
    if (policy.tool && policy.tool !== input.tool) return false;
    if (policy.path && !policy.path.test(path)) return false;
    return true;
  });
  if (!match) {
    const target = input.mode === "mcp-call" ? input.tool ?? "<missing-tool>" : `${input.method ?? "GET"} /${path}`;
    throw new Error(`Integration operation is not allowlisted: ${input.integrationId} ${input.mode} ${target}`);
  }
  return match;
}

export function integrationOperationPolicyInfo() {
  return {
    model: "explicit-allowlist",
    unknownOperations: "deny",
    destructiveGenericOperations: "deny",
    operations: OPERATIONS.map(({ path, ...policy }) => ({ ...policy, path: path?.source ?? null })),
  };
}

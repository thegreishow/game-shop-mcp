const DEFAULT_RATE_LIMIT = 60;
const windows = new Map<string, { count: number; resetAt: number }>();

export type AuthDecision = { ok: true } | { ok: false; status: number; error: string };

export function authorizeRequest(request: Request): AuthDecision {
  const token = process.env.GAME_SHOP_MCP_TOKEN?.trim();
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (!token) {
    if (production) return { ok: false, status: 503, error: "Gateway authentication is not configured." };
    return { ok: true };
  }
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${token}`) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function enforceRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  const configured = Number(process.env.GAME_SHOP_RATE_LIMIT_PER_MINUTE ?? DEFAULT_RATE_LIMIT);
  const limit = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_RATE_LIMIT;
  const now = Date.now();
  const key = clientKey(request);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (current.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { ok: true };
}

export function githubWritesAllowed() {
  return process.env.GAME_SHOP_ALLOW_GITHUB_WRITES === "true";
}

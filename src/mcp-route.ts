import { authorizeMcpToolRequest, authorizeRequest, enforceRateLimit, oauthChallenge } from "./security.js";

export async function guardMcpRequest(request: Request) {
  let auth = authorizeRequest(request);
  if (auth.ok) auth = await authorizeMcpToolRequest(request, auth);
  if (!auth.ok) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (auth.status === 401) headers["www-authenticate"] = oauthChallenge(request);
    if (auth.status === 403 && auth.requiredScopes?.length) {
      headers["www-authenticate"] = `${oauthChallenge(request)}, scope="${auth.requiredScopes.join(" ")}"`;
    }
    return {
      ok: false as const,
      response: new Response(JSON.stringify({ error: auth.error, requiredScopes: auth.requiredScopes ?? undefined }), {
        status: auth.status,
        headers,
      }),
    };
  }

  const rate = enforceRateLimit(request);
  if (!rate.ok) {
    return {
      ok: false as const,
      response: new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rate.retryAfter),
        },
      }),
    };
  }

  return { ok: true as const, auth };
}

export async function routeMcp(request: Request, handler: (request: Request) => Promise<Response>) {
  const guarded = await guardMcpRequest(request);
  if (!guarded.ok) return guarded.response;
  return handler(request);
}

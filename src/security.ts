import { oauthBase, verifyAccessToken } from "./oauth.js";

const DEFAULT_RATE_LIMIT = 60;
const windows = new Map<string, { count: number; resetAt: number }>();

export type AuthDecision = { ok: true; mode?: "gateway"|"oauth"; scopes?: string[] } | { ok: false; status: number; error: string; requiredScopes?: string[] };

const ROUTE_SCOPE: Array<[RegExp, string]> = [
  [/\/api\/advanced(?:\/|$)/, "gameshop.execute"],
  [/\/api\/qa(?:\/|$)/, "gameshop.qa"],
  [/\/api\/diagnostics(?:\/|$)/, "gameshop.qa"],
  [/\/api\/learning(?:\/|$)/, "gameshop.qa"],
  [/\/api\/storage(?:\/|$)/, "gameshop.write"],
  [/\/api\/tasks(?:\/|$)/, "gameshop.execute"],
  [/\/api\/control-center(?:\/|$)/, "gameshop.read"],
];

function routeScope(request: Request) {
  const path = new URL(request.url).pathname;
  return ROUTE_SCOPE.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}

export function authorizeRequest(request: Request): AuthDecision {
  const gatewayToken = process.env.GAME_SHOP_MCP_TOKEN?.trim();
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const provided = request.headers.get("authorization")?.trim();
  if (gatewayToken && provided === `Bearer ${gatewayToken}`) return { ok: true, mode: "gateway" };
  if (provided?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(provided.slice(7), oauthBase(request));
      const scopes = payload.scope.split(/\s+/).filter(Boolean);
      const required = routeScope(request);
      if (required && !scopes.includes(required)) {
        return { ok: false, status: 403, error: `Insufficient OAuth scope: ${required}`, requiredScopes: [required] };
      }
      return { ok: true, mode: "oauth", scopes };
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) return error as AuthDecision;
    }
  }
  if (!gatewayToken && !process.env.GAME_SHOP_OAUTH_SIGNING_SECRET?.trim()) {
    if (production) return { ok: false, status: 503, error: "Gateway authentication is not configured." };
    return { ok: true };
  }
  return { ok: false, status: 401, error: "Unauthorized" };
}

export function oauthChallenge(request:Request){const base=oauthBase(request);return `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`;}

const WRITE_TOOL=/(github_upsert|create_project_branch|create_project_pr|apply_patch|patch_worker|place_artifact)/i;
const DEPLOY_TOOL=/(deploy|preview_deployment|create_preview|release_to_production)/i;
const QA_TOOL=/(verify|qa_|diagnostic|release_governor|repair)/i;
const PLAN_TOOL=/(plan_|prepare_execution|route_|routing_matrix|build_matrix|motion_matrix)/i;
const EXECUTE_TOOL=/(execute_|invoke_|orchestrate|generate_|cancel_|approve_|promote|persist_artifact|task_update|task_cancel)/i;

export function requiredScopesForTool(name:string):string[]{
  if(DEPLOY_TOOL.test(name))return["gameshop.deploy"];
  if(WRITE_TOOL.test(name))return["gameshop.write"];
  if(QA_TOOL.test(name))return["gameshop.qa"];
  if(PLAN_TOOL.test(name))return["gameshop.plan"];
  if(EXECUTE_TOOL.test(name))return["gameshop.execute"];
  return["gameshop.read"];
}

function toolCalls(payload:unknown):Array<{name:string}>{
  const rows=Array.isArray(payload)?payload:[payload];
  const calls:Array<{name:string}>=[];
  for(const row of rows){
    if(!row||typeof row!=="object")continue;
    const rpc=row as Record<string,unknown>;
    if(rpc.method!=="tools/call")continue;
    const params=rpc.params as Record<string,unknown>|undefined;
    if(params&&typeof params.name==="string")calls.push({name:params.name});
  }
  return calls;
}

export async function authorizeMcpToolRequest(request:Request,auth:AuthDecision):Promise<AuthDecision>{
  if(!auth.ok||auth.mode!=="oauth")return auth;
  if(request.method!=="POST")return auth;
  let payload:unknown;
  try{payload=await request.clone().json();}catch{return auth;}
  const available=new Set(auth.scopes??[]);
  const required=[...new Set(toolCalls(payload).flatMap(call=>requiredScopesForTool(call.name)))];
  const missing=required.filter(scope=>!available.has(scope));
  if(missing.length)return{ok:false,status:403,error:`Insufficient OAuth scope: ${missing.join(", ")}`,requiredScopes:missing};
  return auth;
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

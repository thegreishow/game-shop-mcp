import { authorizeMcpToolRequest, authorizeRequest, oauthChallenge } from "./security.js";
import { enforceDistributedRateLimit } from "./distributed-rate-limit.js";
import { logEvent } from "./governance-ledger.js";
import { hydrateProjectRegistryV2 } from "./project-registry-v2.js";
let hydrated=false;
async function hydrate(){if(hydrated)return;try{await hydrateProjectRegistryV2();hydrated=true;}catch{}}
export async function guardMcpRequest(request: Request) {
  const started=Date.now();await hydrate();let auth=authorizeRequest(request);if(auth.ok)auth=await authorizeMcpToolRequest(request,auth);
  if(!auth.ok){const headers:Record<string,string>={"content-type":"application/json"};if(auth.status===401)headers["www-authenticate"]=oauthChallenge(request);if(auth.status===403&&auth.requiredScopes?.length)headers["www-authenticate"]=`${oauthChallenge(request)}, scope="${auth.requiredScopes.join(" ")}"`;return{ok:false as const,response:new Response(JSON.stringify({error:auth.error,requiredScopes:auth.requiredScopes??undefined}),{status:auth.status,headers})};}
  const rate=await enforceDistributedRateLimit(request,auth);if(!rate.ok){await logEvent({type:"rate_limit.blocked",scope:auth.scopes,data:{kind:rate.kind,limit:rate.limit,retryAfter:rate.retryAfter}}).catch(()=>{});return{ok:false as const,response:new Response(JSON.stringify({error:"Rate limit exceeded",class:rate.kind,limit:rate.limit,remaining:rate.remaining}),{status:429,headers:{"content-type":"application/json","retry-after":String(rate.retryAfter),"x-ratelimit-class":rate.kind,"x-ratelimit-limit":String(rate.limit),"x-ratelimit-remaining":String(rate.remaining)}})};}
  await logEvent({type:"mcp.request",scope:auth.scopes,latencyMs:Date.now()-started,data:{method:request.method,rateClass:rate.kind,remaining:rate.remaining}}).catch(()=>{});return{ok:true as const,auth};
}
export async function routeMcp(request:Request,handler:(request:Request)=>Promise<Response>){const guarded=await guardMcpRequest(request);if(!guarded.ok)return guarded.response;return handler(request);}

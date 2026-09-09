const base=(process.env.GAME_SHOP_PUBLIC_URL||process.env.BASE_URL||"https://game-shop-mcp.vercel.app").replace(/\/$/,"");

async function getJson(path:string){const response=await fetch(`${base}${path}`,{headers:{accept:"application/json"}});const text=await response.text();if(!response.ok)throw new Error(`${path} returned ${response.status}: ${text.slice(0,300)}`);let json:unknown;try{json=JSON.parse(text)}catch{throw new Error(`${path} did not return JSON`)}return json as Record<string,unknown>;}
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}

async function main(){
 const auth=await getJson("/.well-known/oauth-authorization-server");
 const resource=await getJson("/.well-known/oauth-protected-resource");
 const status=await getJson("/oauth/status");
 assert(auth.issuer===base,"OAuth issuer mismatch");
 assert(auth.authorization_endpoint===`${base}/oauth/authorize`,"Authorization endpoint mismatch");
 assert(auth.token_endpoint===`${base}/oauth/token`,"Token endpoint mismatch");
 assert(Array.isArray(auth.code_challenge_methods_supported)&&auth.code_challenge_methods_supported.includes("S256"),"PKCE S256 missing");
 assert(resource.resource===`${base}/mcp`,"Protected resource mismatch");
 assert(status.configured===true,"OAuth runtime reports missing signing/owner secret");
 const token=process.env.GAME_SHOP_MCP_TOKEN?.trim();
 let gateway:"skipped"|"accepted"="skipped";
 if(token){
  const response=await fetch(`${base}/mcp`,{headers:{authorization:`Bearer ${token}`}});
  if(response.status===401)throw new Error("Static Game Shop bearer token was rejected by live MCP endpoint");
  gateway="accepted";
 }
 console.log(JSON.stringify({ok:true,base,oauthDiscovery:true,pkce:"S256",runtimeConfigured:true,staticGateway:gateway},null,2));
}

main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exit(1)});

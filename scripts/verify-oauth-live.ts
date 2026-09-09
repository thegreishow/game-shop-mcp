const base=(process.env.GAME_SHOP_PUBLIC_URL||process.argv[2]||"https://game-shop-mcp.vercel.app").replace(/\/$/,"");

function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
async function json(path:string){const response=await fetch(`${base}${path}`,{headers:{accept:"application/json"}});assert(response.ok,`${path} returned ${response.status}`);return response.json() as Promise<Record<string,unknown>>;}

const auth=await json("/.well-known/oauth-authorization-server");
const resource=await json("/.well-known/oauth-protected-resource");

assert(auth.issuer===base,"authorization issuer mismatch");
assert(auth.authorization_endpoint===`${base}/oauth/authorize`,"authorization endpoint mismatch");
assert(auth.token_endpoint===`${base}/oauth/token`,"token endpoint mismatch");
assert(Array.isArray(auth.grant_types_supported)&&auth.grant_types_supported.includes("authorization_code"),"authorization_code grant missing");
assert(Array.isArray(auth.code_challenge_methods_supported)&&auth.code_challenge_methods_supported.includes("S256"),"PKCE S256 missing");
assert(Array.isArray(auth.token_endpoint_auth_methods_supported)&&auth.token_endpoint_auth_methods_supported.includes("none"),"public-client token auth missing");
assert(resource.resource===`${base}/mcp`,"protected resource mismatch");
assert(Array.isArray(resource.authorization_servers)&&resource.authorization_servers.includes(base),"authorization server link missing");

const scopes=Array.isArray(auth.scopes_supported)?auth.scopes_supported:[];
for(const scope of ["gameshop.read","gameshop.plan","gameshop.execute","gameshop.qa","gameshop.write","gameshop.deploy"])assert(scopes.includes(scope),`scope missing: ${scope}`);

console.log(JSON.stringify({ok:true,base,authorization_endpoint:auth.authorization_endpoint,token_endpoint:auth.token_endpoint,resource:resource.resource,scopes},null,2));

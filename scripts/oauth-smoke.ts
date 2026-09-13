import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createAuthorizationCode, createDynamicClient, createDynamicClientFromMetadata, exchangeAuthorizationCode, oauthMetadata, ownerSecretMatches, protectedResourceMetadata, refreshAccessToken, validateOAuthClient, verifyAccessToken } from "../src/oauth.js";
import { authorizeMcpToolRequest, authorizeRequest, requiredScopesForTool } from "../src/security.js";

process.env.GAME_SHOP_OAUTH_SIGNING_SECRET="test-signing-secret-32-bytes-minimum-value";
process.env.GAME_SHOP_OAUTH_OWNER_SECRET="owner-test-secret";
delete process.env.GAME_SHOP_MCP_TOKEN;
delete process.env.GAME_SHOP_SUPABASE_URL;
delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
const issuer="https://game-shop-mcp.vercel.app";
const clientId="game-shop-grok-web";
const redirectUri="https://grok.com/connectors/oauth/callback";
const verifier=randomBytes(32).toString("base64url");
const challenge=createHash("sha256").update(verifier).digest("base64url");
const code=createAuthorizationCode({issuer,clientId,redirectUri,scope:"gameshop.read gameshop.qa offline_access",codeChallenge:challenge});
const token=await exchangeAuthorizationCode({code,clientId,redirectUri,codeVerifier:verifier,issuer});
assert.equal(token.token_type,"Bearer");
assert.match(token.scope,/gameshop\.read/);
assert.match(token.scope,/offline_access/);
assert.ok(token.refresh_token,"offline_access should issue a refresh token");
const claims=verifyAccessToken(token.access_token,issuer);
assert.equal(claims.client_id,clientId);
assert.equal(claims.aud,`${issuer}/mcp`);
const refreshed=refreshAccessToken({refreshToken:token.refresh_token!,clientId,issuer});
assert.equal(refreshed.token_type,"Bearer");
assert.ok(refreshed.refresh_token,"refresh grant should rotate a refresh token");
assert.equal(verifyAccessToken(refreshed.access_token,issuer).client_id,clientId);
const metadata=oauthMetadata(issuer);
assert.equal(metadata.code_challenge_methods_supported[0],"S256");
assert.ok(metadata.grant_types_supported.includes("refresh_token"));
assert.ok(metadata.scopes_supported.includes("offline_access"));
assert.equal(metadata.registration_endpoint,`${issuer}/oauth/register`);
assert.equal(protectedResourceMetadata(issuer).resource,`${issuer}/mcp`);
assert.ok(protectedResourceMetadata(issuer).scopes_supported.includes("offline_access"));
assert.equal(ownerSecretMatches("owner-test-secret"),true);
assert.equal(ownerSecretMatches("wrong"),false);
await assert.rejects(()=>exchangeAuthorizationCode({code,clientId,redirectUri,codeVerifier:verifier,issuer}),/already been used/);
const secondVerifier=randomBytes(32).toString("base64url");
const secondChallenge=createHash("sha256").update(secondVerifier).digest("base64url");
const secondCode=createAuthorizationCode({issuer,clientId,redirectUri,scope:"gameshop.read",codeChallenge:secondChallenge});
await assert.rejects(()=>exchangeAuthorizationCode({code:secondCode,clientId,redirectUri,codeVerifier:"wrong",issuer}),/PKCE/);

const chatgptRedirect="https://chatgpt.com/oauth/callback";
const dynamic=createDynamicClient({issuer,redirectUris:[chatgptRedirect]});
assert.equal(dynamic.token_endpoint_auth_method,"none");
assert.ok(dynamic.grant_types.includes("refresh_token"));
assert.equal(validateOAuthClient(dynamic.client_id,chatgptRedirect,issuer),true);
assert.equal(validateOAuthClient(dynamic.client_id,"https://example.com/callback",issuer),false);

const openAiDcr=createDynamicClientFromMetadata({issuer,metadata:{
  client_name:"ChatGPT",
  application_type:"web",
  redirect_uris:["https://chatgpt.com/oauth/callback"],
  grant_types:["authorization_code","refresh_token"],
  response_types:["code"],
  token_endpoint_auth_method:"none",
  scope:"gameshop.read gameshop.qa offline_access",
  contacts:["security@openai.com"],
  logo_uri:"https://chatgpt.com/favicon.ico"
}});
assert.equal(openAiDcr.redirect_uris[0],"https://chatgpt.com/oauth/callback");
assert.equal(validateOAuthClient(openAiDcr.client_id,"https://chatgpt.com/oauth/callback",issuer),true);

const singularRedirect=createDynamicClientFromMetadata({issuer,metadata:{redirect_uri:"https://chat.openai.com/oauth/callback",token_endpoint_auth_method:"none"}});
assert.equal(singularRedirect.redirect_uris[0],"https://chat.openai.com/oauth/callback");
assert.equal(validateOAuthClient(singularRedirect.client_id,"https://chat.openai.com/oauth/callback",issuer),true);
assert.throws(()=>createDynamicClientFromMetadata({issuer,metadata:{redirect_uris:["https://chatgpt.com/oauth/callback"],token_endpoint_auth_method:"client_secret_basic"}}),/public OAuth clients/);
assert.throws(()=>createDynamicClientFromMetadata({issuer,metadata:{redirect_uris:["https://chatgpt.com/oauth/callback"],grant_types:["client_credentials"]}}),/Unsupported OAuth grant type/);
const dynamicVerifier=randomBytes(32).toString("base64url");
const dynamicChallenge=createHash("sha256").update(dynamicVerifier).digest("base64url");
const dynamicCode=createAuthorizationCode({issuer,clientId:dynamic.client_id,redirectUri:chatgptRedirect,scope:"gameshop.read offline_access",codeChallenge:dynamicChallenge});
const dynamicToken=await exchangeAuthorizationCode({code:dynamicCode,clientId:dynamic.client_id,redirectUri:chatgptRedirect,codeVerifier:dynamicVerifier,issuer});
assert.ok(dynamicToken.refresh_token,"dynamic ChatGPT-style client should receive a refresh token");

assert.deepEqual(requiredScopesForTool("gameshop_plan_build"),["gameshop.plan"]);
assert.deepEqual(requiredScopesForTool("gameshop_verify_project_branch"),["gameshop.qa"]);
assert.deepEqual(requiredScopesForTool("gameshop_github_upsert_file"),["gameshop.write"]);

const readRequest=new Request(`${issuer}/mcp`,{method:"POST",headers:{authorization:`Bearer ${token.access_token}`,"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"gameshop_list_projects",arguments:{}}})});
const readAuth=authorizeRequest(readRequest);
const readScoped=await authorizeMcpToolRequest(readRequest,readAuth);
assert.equal(readScoped.ok,true,"read scope should allow read tools");

const writeRequest=new Request(`${issuer}/mcp`,{method:"POST",headers:{authorization:`Bearer ${token.access_token}`,"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"gameshop_github_upsert_file",arguments:{}}})});
const writeAuth=authorizeRequest(writeRequest);
const writeScoped=await authorizeMcpToolRequest(writeRequest,writeAuth);
assert.equal(writeScoped.ok,false,"read+qa token must not authorize write tools");
if(!writeScoped.ok){assert.equal(writeScoped.status,403);assert.deepEqual(writeScoped.requiredScopes,["gameshop.write"]);}

console.log("OAuth PKCE + refresh token + dynamic client + tool-scope smoke OK");

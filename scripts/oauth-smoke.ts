import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createAuthorizationCode, exchangeAuthorizationCode, oauthMetadata, ownerSecretMatches, protectedResourceMetadata, verifyAccessToken } from "../src/oauth.js";
import { authorizeMcpToolRequest, authorizeRequest, requiredScopesForTool } from "../src/security.js";

process.env.GAME_SHOP_OAUTH_SIGNING_SECRET="test-signing-secret-32-bytes-minimum-value";
process.env.GAME_SHOP_OAUTH_OWNER_SECRET="owner-test-secret";
delete process.env.GAME_SHOP_MCP_TOKEN;
const issuer="https://game-shop-mcp.vercel.app";
const clientId="game-shop-grok-web";
const redirectUri="https://grok.com/connectors/oauth/callback";
const verifier=randomBytes(32).toString("base64url");
const challenge=createHash("sha256").update(verifier).digest("base64url");
const code=createAuthorizationCode({issuer,clientId,redirectUri,scope:"gameshop.read gameshop.qa",codeChallenge:challenge});
const token=exchangeAuthorizationCode({code,clientId,redirectUri,codeVerifier:verifier,issuer});
assert.equal(token.token_type,"Bearer");
assert.match(token.scope,/gameshop\.read/);
const claims=verifyAccessToken(token.access_token,issuer);
assert.equal(claims.client_id,clientId);
assert.equal(claims.aud,`${issuer}/mcp`);
assert.equal(oauthMetadata(issuer).code_challenge_methods_supported[0],"S256");
assert.equal(protectedResourceMetadata(issuer).resource,`${issuer}/mcp`);
assert.equal(ownerSecretMatches("owner-test-secret"),true);
assert.equal(ownerSecretMatches("wrong"),false);
assert.throws(()=>exchangeAuthorizationCode({code,clientId,redirectUri,codeVerifier:"wrong",issuer}),/PKCE/);
assert.throws(()=>exchangeAuthorizationCode({code,clientId,redirectUri,codeVerifier:verifier,issuer}),/already been used/);
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

console.log("OAuth PKCE + replay + tool-scope smoke OK");

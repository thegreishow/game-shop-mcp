import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { consumeAuthorizationCode } from "./oauth-store.js";

export const GAME_SHOP_SCOPES=["gameshop.read","gameshop.plan","gameshop.execute","gameshop.qa","gameshop.write","gameshop.deploy"] as const;
export const OAUTH_SCOPES=[...GAME_SHOP_SCOPES,"offline_access"] as const;
export type GameShopScope=typeof GAME_SHOP_SCOPES[number];

type SignedPayload={typ:"code"|"access"|"refresh"|"client";iss:string;aud:string;sub:string;client_id:string;scope:string;iat:number;exp:number;redirect_uri?:string;redirect_uris?:string[];code_challenge?:string;resource?:string;jti:string};
const b64=(value:string|Buffer)=>Buffer.from(value).toString("base64url");
const unb64=(value:string)=>Buffer.from(value,"base64url").toString("utf8");
function signingSecret(){const value=process.env.GAME_SHOP_OAUTH_SIGNING_SECRET?.trim();if(!value)throw new Error("OAuth signing secret is not configured.");return value;}
function signature(input:string){return createHmac("sha256",signingSecret()).update(input).digest("base64url");}
function sign(payload:SignedPayload){const body=b64(JSON.stringify(payload));return `${body}.${signature(body)}`;}
function verify(token:string,expected:SignedPayload["typ"]){const [body,sig]=token.split(".");if(!body||!sig)throw new Error("Invalid OAuth token.");const expectedSig=signature(body);const a=Buffer.from(sig),b=Buffer.from(expectedSig);if(a.length!==b.length||!timingSafeEqual(a,b))throw new Error("Invalid OAuth token signature.");const payload=JSON.parse(unb64(body)) as SignedPayload;if(payload.typ!==expected||payload.exp<=Math.floor(Date.now()/1000))throw new Error("OAuth token expired or invalid.");return payload;}
export function oauthBase(request?:Request){return process.env.GAME_SHOP_PUBLIC_URL?.replace(/\/$/,"")||(request?new URL(request.url).origin:"https://game-shop-mcp.vercel.app");}
export function oauthClientId(){return process.env.GAME_SHOP_OAUTH_CLIENT_ID?.trim()||"game-shop-grok-web";}
export function ownerSecret(){return process.env.GAME_SHOP_OAUTH_OWNER_SECRET?.trim()||"";}
export function ownerSecretMatches(candidate:string){const expected=ownerSecret();if(!expected)return false;const a=Buffer.from(candidate),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
export function normalizeScope(raw:string|undefined){const requested=(raw||"gameshop.read").split(/\s+/).filter(Boolean);const allowed=requested.filter(scope=>(OAUTH_SCOPES as readonly string[]).includes(scope));return allowed.length?allowed.join(" "):"gameshop.read";}
export function redirectAllowed(raw:string){try{const url=new URL(raw);const extra=(process.env.GAME_SHOP_OAUTH_REDIRECT_HOSTS||"").split(",").map(v=>v.trim()).filter(Boolean);if(url.protocol==="https:"){const allowed=["grok.com","x.ai","chatgpt.com","openai.com",...extra];return allowed.some(host=>url.hostname===host||url.hostname.endsWith(`.${host}`));}if(url.protocol==="http:"){return ["localhost","127.0.0.1","::1","[::1]"].includes(url.hostname);}return ["chatgpt:","openai:","com.openai.chatgpt:"].includes(url.protocol);}catch{return false;}}
export function canonicalResource(issuer:string){return `${issuer.replace(/\/$/,"")}/mcp`;}
export function normalizeResource(raw:string|undefined,issuer:string){const expected=canonicalResource(issuer);if(!raw)return expected;let candidate="";try{candidate=new URL(raw).toString().replace(/\/$/,"");}catch{throw new Error("Invalid OAuth resource.");}if(candidate!==expected)throw new Error("OAuth resource does not match the protected Game Shop MCP resource.");return candidate;}

export type DynamicClientRegistrationMetadata={
  [key:string]:unknown;
  redirect_uris?:unknown;
  redirect_uri?:unknown;
  token_endpoint_auth_method?:unknown;
  grant_types?:unknown;
  response_types?:unknown;
  scope?:unknown;
};

function stringArray(value:unknown){if(Array.isArray(value))return value.filter((item):item is string=>typeof item==="string");if(typeof value==="string")return[value];return[];}
function normalizeRegistrationRedirectUris(input:DynamicClientRegistrationMetadata){
  const values=[...stringArray(input.redirect_uris)];
  if(typeof input.redirect_uri==="string")values.push(input.redirect_uri);
  return [...new Set(values.map(v=>v.trim()).filter(Boolean))];
}
function normalizedRegistrationScope(input:DynamicClientRegistrationMetadata){return typeof input.scope==="string"?normalizeScope(input.scope):undefined;}

export function createDynamicClient(input:{issuer:string;redirectUris:string[];metadata?:DynamicClientRegistrationMetadata}){
  const metadata=input.metadata||{};
  const redirectUris=[...new Set(input.redirectUris.map(v=>v.trim()).filter(Boolean))];
  if(!redirectUris.length||redirectUris.some(uri=>!redirectAllowed(uri)))throw new Error("Invalid OAuth redirect URI.");
  const now=Math.floor(Date.now()/1000);
  const clientId=sign({typ:"client",iss:input.issuer,aud:`${input.issuer}/oauth/authorize`,sub:"dynamic-client",client_id:"dynamic",scope:"",iat:now,exp:now+31536000,redirect_uris:redirectUris,jti:crypto.randomUUID()});
  const response:{client_id:string;client_id_issued_at:number;redirect_uris:string[];token_endpoint_auth_method:"none";grant_types:string[];response_types:string[];client_name?:string;scope?:string}={client_id:clientId,client_id_issued_at:now,redirect_uris:redirectUris,token_endpoint_auth_method:"none",grant_types:["authorization_code","refresh_token"],response_types:["code"]};
  if(typeof metadata.client_name==="string"&&metadata.client_name.trim())response.client_name=metadata.client_name.trim();
  const scope=normalizedRegistrationScope(metadata);if(scope)response.scope=scope;
  return response;
}

export function createDynamicClientFromMetadata(input:{issuer:string;metadata:DynamicClientRegistrationMetadata}){
  return createDynamicClient({issuer:input.issuer,redirectUris:normalizeRegistrationRedirectUris(input.metadata),metadata:input.metadata});
}

export function validateOAuthClient(clientId:string,redirectUri:string,issuer:string){
  if(clientId===oauthClientId())return redirectAllowed(redirectUri);
  try{const payload=verify(clientId,"client");return payload.iss===issuer&&payload.aud===`${issuer}/oauth/authorize`&&Boolean(payload.redirect_uris?.includes(redirectUri));}catch{return false;}
}

export function createAuthorizationCode(input:{issuer:string;clientId:string;redirectUri:string;scope:string;codeChallenge:string;resource?:string}){const now=Math.floor(Date.now()/1000);const resource=normalizeResource(input.resource,input.issuer);return sign({typ:"code",iss:input.issuer,aud:`${input.issuer}/oauth/token`,sub:"game-shop-owner",client_id:input.clientId,scope:normalizeScope(input.scope),iat:now,exp:now+180,redirect_uri:input.redirectUri,code_challenge:input.codeChallenge,resource,jti:crypto.randomUUID()});}
function issueTokens(input:{issuer:string;clientId:string;subject:string;scope:string;resource:string}){const now=Math.floor(Date.now()/1000);const access=sign({typ:"access",iss:input.issuer,aud:input.resource,sub:input.subject,client_id:input.clientId,scope:input.scope,iat:now,exp:now+3600,resource:input.resource,jti:crypto.randomUUID()});const response:{access_token:string;token_type:"Bearer";expires_in:number;scope:string;resource:string;refresh_token?:string}={access_token:access,token_type:"Bearer",expires_in:3600,scope:input.scope,resource:input.resource};if(input.scope.split(/\s+/).includes("offline_access")){response.refresh_token=sign({typ:"refresh",iss:input.issuer,aud:`${input.issuer}/oauth/token`,sub:input.subject,client_id:input.clientId,scope:input.scope,iat:now,exp:now+2592000,resource:input.resource,jti:crypto.randomUUID()});}return response;}
export async function exchangeAuthorizationCode(input:{code:string;clientId:string;redirectUri:string;codeVerifier:string;issuer:string;resource?:string}){const payload=verify(input.code,"code");if(payload.client_id!==input.clientId||payload.redirect_uri!==input.redirectUri||payload.iss!==input.issuer||payload.aud!==`${input.issuer}/oauth/token`)throw new Error("Authorization code binding mismatch.");if(!validateOAuthClient(input.clientId,input.redirectUri,input.issuer))throw new Error("OAuth client validation failed.");const resource=normalizeResource(input.resource,input.issuer);if(payload.resource!==resource)throw new Error("OAuth resource binding mismatch.");const challenge=createHash("sha256").update(input.codeVerifier).digest("base64url");if(challenge!==payload.code_challenge)throw new Error("PKCE verification failed.");const consumed=await consumeAuthorizationCode({jti:payload.jti,clientId:payload.client_id,subject:payload.sub,redirectUri:payload.redirect_uri||"",scope:payload.scope,codeChallenge:payload.code_challenge||"",createdAt:new Date(payload.iat*1000).toISOString(),expiresAt:new Date(payload.exp*1000).toISOString(),consumedAt:new Date().toISOString()});if(!consumed)throw new Error("Authorization code has already been used.");return issueTokens({issuer:input.issuer,clientId:payload.client_id,subject:payload.sub,scope:payload.scope,resource});}
export function refreshAccessToken(input:{refreshToken:string;clientId:string;issuer:string;resource?:string;scope?:string}){const payload=verify(input.refreshToken,"refresh");if(payload.client_id!==input.clientId||payload.iss!==input.issuer||payload.aud!==`${input.issuer}/oauth/token`)throw new Error("Refresh token binding mismatch.");const resource=normalizeResource(input.resource,input.issuer);if(payload.resource!==resource)throw new Error("OAuth resource binding mismatch.");const original=new Set(payload.scope.split(/\s+/).filter(Boolean));const requested=input.scope?normalizeScope(input.scope).split(/\s+/).filter(Boolean):[...original];if(requested.some(scope=>!original.has(scope)))throw new Error("Refresh scope exceeds original grant.");const scope=requested.join(" ");return issueTokens({issuer:input.issuer,clientId:payload.client_id,subject:payload.sub,scope,resource});}
export function verifyAccessToken(token:string,issuer?:string){const payload=verify(token,"access");if(issuer&&payload.iss!==issuer)throw new Error("OAuth issuer mismatch.");const resource=canonicalResource(payload.iss);if(payload.aud!==resource||payload.resource!==resource)throw new Error("OAuth audience mismatch.");return payload;}
export function oauthMetadata(base:string){return{issuer:base,authorization_endpoint:`${base}/oauth/authorize`,token_endpoint:`${base}/oauth/token`,registration_endpoint:`${base}/oauth/register`,response_types_supported:["code"],grant_types_supported:["authorization_code","refresh_token"],code_challenge_methods_supported:["S256"],token_endpoint_auth_methods_supported:["none"],scopes_supported:OAUTH_SCOPES,client_id_metadata_document_supported:false};}
export function protectedResourceMetadata(base:string){return{resource:canonicalResource(base),authorization_servers:[base],scopes_supported:OAUTH_SCOPES,bearer_methods_supported:["header"]};}

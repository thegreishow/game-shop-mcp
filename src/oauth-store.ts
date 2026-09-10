type OAuthCodeRecord={jti:string;clientId:string;subject:string;redirectUri:string;scope:string;codeChallenge:string;createdAt:string;expiresAt:string;consumedAt?:string};
type OAuthConsentRecord={consentId:string;clientId:string;subject:string;scope:string;createdAt:string;approved:boolean};

const consumedMemory=new Map<string,number>();

function config(){
  const url=process.env.GAME_SHOP_SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url&&key?{url,key}:null;
}

async function request(path:string,init:RequestInit={}){
  const c=config();
  if(!c)return null;
  const response=await fetch(`${c.url}/rest/v1/${path}`,{
    ...init,
    headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,"content-type":"application/json",...(init.headers||{})},
    signal:AbortSignal.timeout(12000),
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`OAuth store request failed (${response.status}).`);
  return text?JSON.parse(text):null;
}

export function oauthStoreInfo(){return{backend:config()?"supabase-postgres":"process-memory-fallback",durableAcrossColdStarts:Boolean(config()),tables:["game_shop_oauth_code_consumptions","game_shop_oauth_consents","game_shop_oauth_revocations"],policy:{authorizationCodesSingleUse:true,consentAudit:true,revocationLedger:true}};}

export async function consumeAuthorizationCode(record:OAuthCodeRecord){
  const c=config();
  if(!c){
    const now=Math.floor(Date.now()/1000);
    for(const[jti,exp]of consumedMemory)if(exp<=now)consumedMemory.delete(jti);
    if(consumedMemory.has(record.jti))return false;
    consumedMemory.set(record.jti,Math.floor(new Date(record.expiresAt).getTime()/1000));
    return true;
  }
  const row={jti:record.jti,client_id:record.clientId,subject:record.subject,redirect_uri:record.redirectUri,scope:record.scope,code_challenge:record.codeChallenge,created_at:record.createdAt,expires_at:record.expiresAt,consumed_at:record.consumedAt??new Date().toISOString()};
  const response=await fetch(`${c.url}/rest/v1/game_shop_oauth_code_consumptions`,{
    method:"POST",
    headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,"content-type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify(row),
    signal:AbortSignal.timeout(12000),
  });
  if(response.status===409)return false;
  if(!response.ok)throw new Error(`OAuth code consume failed (${response.status}).`);
  return true;
}

export async function recordOAuthConsent(input:{clientId:string;subject:string;scope:string;approved:boolean}){
  const consent:OAuthConsentRecord={consentId:`cons_${crypto.randomUUID()}`,clientId:input.clientId,subject:input.subject,scope:input.scope,approved:input.approved,createdAt:new Date().toISOString()};
  if(!config())return consent;
  await request("game_shop_oauth_consents",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({consent_id:consent.consentId,client_id:consent.clientId,subject:consent.subject,scope:consent.scope,approved:consent.approved,created_at:consent.createdAt})});
  return consent;
}

export async function revokeAccessToken(input:{jti:string;clientId:string;subject:string;expiresAt:string}){
  const row={jti:input.jti,client_id:input.clientId,subject:input.subject,expires_at:input.expiresAt,revoked_at:new Date().toISOString()};
  if(!config())return row;
  await request("game_shop_oauth_revocations",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(row)});
  return row;
}

import type { GameShopScope } from "./oauth.js";

const READ:GameShopScope="gameshop.read";
const PLAN:GameShopScope="gameshop.plan";
const EXECUTE:GameShopScope="gameshop.execute";
const QA:GameShopScope="gameshop.qa";
const WRITE:GameShopScope="gameshop.write";
const DEPLOY:GameShopScope="gameshop.deploy";

const exact:Record<string,GameShopScope>={
  gameshop_plan_build:PLAN,
  gameshop_prepare_execution:PLAN,
  gameshop_plan_project:PLAN,
  gameshop_execute_github_plan:EXECUTE,
  gameshop_cancel_execution:EXECUTE,
  gameshop_invoke_integration:EXECUTE,
  gameshop_orchestrate_integrations:EXECUTE,
  gameshop_generate_character:EXECUTE,
  gameshop_generate_animation:EXECUTE,
  gameshop_spritecook_generate:EXECUTE,
  gameshop_create_project_branch:WRITE,
  gameshop_github_upsert_file:WRITE,
  gameshop_create_project_pr:WRITE,
  gameshop_run_qa:QA,
  gameshop_run_qa_swarm:QA,
  gameshop_queue_playwright_ci:QA,
  gameshop_apply_patch:WRITE,
  gameshop_create_preview:DEPLOY,
};

export function requiredScopeForTool(name:string):GameShopScope{
  if(exact[name])return exact[name];
  if(/(?:deploy|preview)/i.test(name))return DEPLOY;
  if(/(?:patch|upsert|create_project_branch|create_project_pr)/i.test(name))return WRITE;
  if(/(?:qa|verify|repair|playwright|browser|diagnostic)/i.test(name))return QA;
  if(/(?:execute|invoke|orchestrate|generate|cancel)/i.test(name))return EXECUTE;
  if(/(?:plan|prepare)/i.test(name))return PLAN;
  return READ;
}

export function scopeAllows(granted:string[]|undefined,required:GameShopScope){
  if(!granted)return true;
  return granted.includes(required);
}

export async function authorizeMcpToolCall(request:Request,scopes:string[]|undefined){
  if(!scopes||request.method!=="POST")return{ok:true as const};
  let body:any;
  try{body=await request.clone().json();}catch{return{ok:true as const};}
  if(body?.method!=="tools/call")return{ok:true as const};
  const name=String(body?.params?.name||"");
  const required=requiredScopeForTool(name);
  if(scopeAllows(scopes,required))return{ok:true as const,required};
  return{ok:false as const,status:403,required,error:`OAuth token is missing required scope: ${required}`};
}

export function oauthScopePolicy(){return{default:READ,toolOverrides:exact,precedence:[DEPLOY,WRITE,QA,EXECUTE,PLAN,READ]};}

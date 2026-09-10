import { routeMultiDomain, type Domain, type Preference } from "./multidomain-router.js";

export type ProductKind = "website"|"web-app"|"browser-game"|"mobile-app"|"desktop-app"|"api-service"|"agent"|"automation"|"interactive-experience"|"digital-product"|"media-project"|"commerce"|"other";
export type BuildGoal = "premium"|"cinematic"|"playful"|"minimal"|"immersive"|"conversion"|"performance"|"reliable"|"secure"|"scalable";
export type BuildPlanRequest={brief:string;product:ProductKind;goals?:BuildGoal[];framework?:"react"|"vanilla"|"vue"|"phaser"|"three"|"node"|"python"|"expo"|"any";preference?:Preference;includeDomains?:Domain[]};
type PlanPhase="foundation"|"data"|"visual-system"|"interaction"|"scene"|"media"|"commerce"|"quality"|"release";
type PlanStep={id:string;phase:PlanPhase;domain:Domain;capability:string;engine:string|null;install?:string;connect?:string;action:string;dependsOn:string[]};
const capabilities:Record<Domain,string[]>={
  ui:["component","layout"],
  motion:["timeline","micro-interaction","smooth-scroll"],
  "3d":["scene","interactive-3d"],
  shader:["shader","webgl-effect"],
  video:["motion-design","video"],
  audio:["speech","sound-effects"],
  backend:["serverless","api"],
  data:["database","project-context"],
  storage:["object-storage","asset-delivery"],
  auth:["authentication","authorization"],
  testing:["browser-test","regression"],
  deployment:["preview","deploy"],
  commerce:["payments","checkout"],
  observability:["logs","performance"],
  "design-reference":["visual-reference","design-guidance"],
  "agent-platform":["build-workflow","agent-ui"],
};

function add(target:Domain[],...domains:Domain[]){for(const domain of domains)if(!target.includes(domain))target.push(domain);}
function defaultDomains(product:ProductKind,goals:BuildGoal[]):Domain[]{
  const d:Domain[]=["design-reference","agent-platform"];
  if(!["api-service","automation"].includes(product))add(d,"ui","motion");
  if(["website","web-app","mobile-app","desktop-app","api-service","agent","automation","commerce","digital-product"].includes(product))add(d,"backend","data","auth","storage");
  if(product==="browser-game"||product==="interactive-experience"||goals.includes("immersive")||goals.includes("cinematic"))add(d,"3d","shader","audio");
  if(product==="media-project"||goals.includes("cinematic")||goals.includes("conversion"))add(d,"video","audio","storage");
  if(product==="commerce")add(d,"commerce");
  if(product==="agent"||product==="automation")add(d,"data","observability");
  add(d,"testing","deployment","observability");
  if(goals.includes("secure"))add(d,"auth","testing");
  if(goals.includes("reliable")||goals.includes("scalable"))add(d,"testing","observability","deployment");
  return d;
}
function phaseFor(d:Domain):PlanPhase{if(d==="design-reference"||d==="agent-platform"||d==="auth")return"foundation";if(d==="backend"||d==="data"||d==="storage")return"data";if(d==="ui")return"visual-system";if(d==="motion")return"interaction";if(d==="3d"||d==="shader")return"scene";if(d==="video"||d==="audio")return"media";if(d==="commerce")return"commerce";if(d==="testing"||d==="observability")return"quality";return"release";}
function dependencies(steps:PlanStep[],phase:PlanPhase){if(phase==="foundation")return[];const wanted:PlanPhase[]=phase==="data"?["foundation"]:phase==="visual-system"?["foundation","data"]:phase==="interaction"?["foundation","visual-system"]:phase==="scene"||phase==="media"||phase==="commerce"?["foundation","data","visual-system"]:phase==="quality"?["foundation","data","visual-system","interaction","scene","media","commerce"]:["quality"];return steps.filter(step=>wanted.includes(step.phase)).map(step=>step.id).slice(-8);}

export function createBuildPlan(request:BuildPlanRequest){
  const goals:BuildGoal[]=request.goals?.length?request.goals:["premium","reliable"];
  const domains=request.includeDomains?.length?request.includeDomains:defaultDomains(request.product,goals);
  const preference=request.preference??(goals.includes("performance")?"bundle":goals.includes("premium")||goals.includes("cinematic")?"quality":"balanced");
  const framework=request.framework??"any";
  const steps:PlanStep[]=[];
  for(const domain of domains){for(const capability of capabilities[domain]){const routed=routeMultiDomain({domain,capability,preference,framework});const s=routed.selected;const phase=phaseFor(domain);const id=`${domain}-${capability}`;steps.push({id,phase,domain,capability,engine:s?.id??null,install:s?.install,connect:s?.connect,action:s?`Use ${s.id} for ${capability}. ${s.notes}`:`No verified route for ${capability}; keep manual until integration is verified.`,dependsOn:dependencies(steps,phase)});}}
  const installs=[...new Set(steps.map(s=>s.install).filter((x):x is string=>Boolean(x)))];
  const connections=[...new Set(steps.map(s=>s.connect).filter((x):x is string=>Boolean(x)))];
  const unresolved=steps.filter(step=>!step.engine).map(step=>({domain:step.domain,capability:step.capability}));
  return{version:"2.0",brief:request.brief,product:request.product,goals,framework,preference,domains,installs,connections,steps,unresolved,artifactPolicy:{firstClass:true,scope:"All generated or imported outputs attach to the execution as typed artifacts across games, sites, apps, services, agents, automations, commerce and media."},qualityPolicy:{previewBeforeProduction:true,independentBrowserEvidence:true,repairOnControlledBranch:true,releaseGate:true},executionPolicy:{paidGeneration:"Respect GAME_SHOP_ALLOW_PAID_GENERATION; a plan never grants billing permission.",externalServices:"Use only authorized services and verified integration contracts.",libraries:"Install libraries in the target project, not the gateway unless the gateway imports them.",registries:"Use official registries and preserve license restrictions.",writes:"Project mutations stay inside registered project roots on gameshop/* branches.",production:"Production deployment requires a separate explicit release decision."}};
}
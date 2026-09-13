import { getProjectOverlay, removeProjectOverlay, setProjectOverlay } from "./project-overlay.js";

export type RegisteredProjectV2={projectId:string;name:string;productKind:string;repo:string;projectRoot:string;defaultBranch:string;framework?:string;deploymentProvider?:string;deploymentProject?:string;artifactDestinations?:Record<string,string>;qaPolicy?:Record<string,unknown>;requiredRegressions?:string[];permissionProfile?:Record<string,unknown>;budgetProfile?:Record<string,unknown>;brandContext?:Record<string,unknown>;createdAt:string;updatedAt:string};
const memory=new Map<string,RegisteredProjectV2>();
function config(){const url=process.env.GAME_SHOP_SUPABASE_URL?.replace(/\/$/,"");const key=process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;return url&&key?{url,key}:null;}
async function request(path:string,init:RequestInit={}){const c=config();if(!c)return null;const r=await fetch(`${c.url}/rest/v1/${path}`,{...init,headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,"content-type":"application/json",Prefer:"return=representation",...(init.headers||{})},signal:AbortSignal.timeout(10000)});const text=await r.text();if(!r.ok)throw new Error(`Project registry failed (${r.status}).`);return text?JSON.parse(text):null;}
function row(p:RegisteredProjectV2){return{project_id:p.projectId,name:p.name,product_kind:p.productKind,repo:p.repo,project_root:p.projectRoot,default_branch:p.defaultBranch,framework:p.framework??null,deployment_provider:p.deploymentProvider??null,deployment_project:p.deploymentProject??null,artifact_destinations:p.artifactDestinations??{},qa_policy:p.qaPolicy??{},required_regressions:p.requiredRegressions??[],permission_profile:p.permissionProfile??{},budget_profile:p.budgetProfile??{},brand_context:p.brandContext??{},created_at:p.createdAt,updated_at:p.updatedAt};}
function fromRow(r:Record<string,unknown>):RegisteredProjectV2{return{projectId:String(r.project_id),name:String(r.name),productKind:String(r.product_kind),repo:String(r.repo),projectRoot:String(r.project_root),defaultBranch:String(r.default_branch),framework:r.framework?String(r.framework):undefined,deploymentProvider:r.deployment_provider?String(r.deployment_provider):undefined,deploymentProject:r.deployment_project?String(r.deployment_project):undefined,artifactDestinations:(r.artifact_destinations??{}) as Record<string,string>,qaPolicy:(r.qa_policy??{}) as Record<string,unknown>,requiredRegressions:Array.isArray(r.required_regressions)?r.required_regressions.map(String):[],permissionProfile:(r.permission_profile??{}) as Record<string,unknown>,budgetProfile:(r.budget_profile??{}) as Record<string,unknown>,brandContext:(r.brand_context??{}) as Record<string,unknown>,createdAt:String(r.created_at),updatedAt:String(r.updated_at)};}

// V2 is operational enrichment only. A stored record may add display/framework
// metadata to a canonical project, but it may never establish project existence,
// repository, branch, or root independently of arcade/games/games.json.
function activate(p:RegisteredProjectV2){
  const canonical=getProjectOverlay(p.projectId);
  if(!canonical)return p;
  setProjectOverlay({
    ...canonical,
    name:p.name||canonical.name,
    framework:p.framework||canonical.framework,
    productKind:p.productKind||canonical.productKind,
  });
  return p;
}

export function projectRegistryV2Info(){return{backend:config()?"supabase+memory":"memory",dynamic:true,authority:"arcade/games/games.json",role:"operational-enrichment-only",legacyFallback:false,registrationRequiresCodeChange:false,table:"game_shop_projects",feedsAllProjectTools:true};}
export async function registerProjectV2(input:Omit<RegisteredProjectV2,"createdAt"|"updatedAt">){if(!/^[\w.-]+\/[\w.-]+$/.test(input.repo))throw new Error("repo must be owner/name");if(input.projectRoot.includes("..")||input.projectRoot.startsWith("/"))throw new Error("projectRoot must be repository-relative");const now=new Date().toISOString();const existing=await getProjectV2(input.projectId);const project={...input,createdAt:existing?.createdAt??now,updatedAt:now};memory.set(project.projectId,project);activate(project);const data=await request("game_shop_projects?on_conflict=project_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(row(project))});if(Array.isArray(data)&&data[0])return activate(fromRow(data[0]));return project;}
export async function getProjectV2(projectId:string){if(memory.has(projectId))return activate(memory.get(projectId)!);const data=await request(`game_shop_projects?project_id=eq.${encodeURIComponent(projectId)}&limit=1`);if(Array.isArray(data)&&data[0]){const p=activate(fromRow(data[0]));memory.set(p.projectId,p);return p;}return null;}
export async function listProjectsV2(){const data=await request("game_shop_projects?order=updated_at.desc&limit=200");const stored=Array.isArray(data)?data.map(fromRow):[...memory.values()];for(const project of stored){memory.set(project.projectId,project);activate(project);}return stored;}
export async function hydrateProjectRegistryV2(){const projects=await listProjectsV2();return{hydrated:projects.length,projects:projects.map(p=>p.projectId),authority:"arcade/games/games.json",role:"enrichment-only"};}
export async function removeProjectV2(projectId:string){memory.delete(projectId);const canonical=getProjectOverlay(projectId);if(canonical){setProjectOverlay(canonical);}else{removeProjectOverlay(projectId);}await request(`game_shop_projects?project_id=eq.${encodeURIComponent(projectId)}`,{method:"DELETE"});return{removed:projectId};}

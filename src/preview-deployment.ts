import { getProject } from "./projects.js";
import { getMissionProject } from "./mission-projects.js";
import { logEvent, recordPreview } from "./governance-ledger.js";

type VercelProject = { projectId:string; teamId?:string; name?:string; repoId?:string|number; deployHookUrl?:string };
function config(projectId:string){const raw=process.env.GAME_SHOP_VERCEL_PROJECTS_JSON;if(!raw)return null;try{return (JSON.parse(raw) as Record<string,VercelProject>)[projectId]??null;}catch{return null;}}
function token(){return process.env.VERCEL_TOKEN?.trim()||null;}
function headers(){const t=token();if(!t)throw new Error("VERCEL_TOKEN is not configured.");return{Authorization:`Bearer ${t}`,"content-type":"application/json"};}
function api(path:string,teamId?:string){const url=new URL(`https://api.vercel.com${path}`);if(teamId)url.searchParams.set("teamId",teamId);return url;}
async function json(url:URL|string,init?:RequestInit){const response=await fetch(url,{...init,signal:AbortSignal.timeout(30000)});const text=await response.text();let body:unknown=text;try{body=text?JSON.parse(text):null;}catch{}if(!response.ok)throw new Error(`Vercel request failed (${response.status}).`);return body;}
export function previewDeploymentInfo(projectId?:string){return{provider:"vercel",configured:Boolean(process.env.VERCEL_TOKEN||process.env.GAME_SHOP_VERCEL_PROJECTS_JSON),project:projectId?config(projectId):undefined,modes:["git-auto-preview-discovery","deploy-hook","rest-git-source"],policy:"Preview only; production target is never selected by this adapter.",registry:"game_shop_previews"};}
export async function createPreviewDeployment(input:{projectId:string;branch:string;commitSha?:string;waitMs?:number}){
  let project:{id:string};try{project=getProject(input.projectId);}catch{project={id:input.projectId};}
  const cfg=config(input.projectId);
  if(!cfg){
    let declared:string|undefined;try{declared=getMissionProject(input.projectId).deployment?.url;}catch{}
    const note=declared?"No explicit Vercel mapping; preserving the project's declared deployment and relying on Git-connected preview discovery.":"No explicit Vercel mapping; relying on the repository's Git-connected preview integration.";
    await recordPreview({projectId:input.projectId,branch:input.branch,commitSha:input.commitSha,provider:"git-auto",previewUrl:declared,status:"pending"}).catch(()=>{});
    await logEvent({type:"preview.discovery.pending",projectId:input.projectId,data:{branch:input.branch,commitSha:input.commitSha??null,declaredUrl:declared??null,note}}).catch(()=>{});
    return{status:"pending",projectId:project.id,branch:input.branch,commitSha:input.commitSha??null,previewUrl:declared??null,events:[{stage:"fallback",mode:"git-auto-preview-discovery",declaredUrl:declared??null}],note};
  }
  if(!/^gameshop\//.test(input.branch))throw new Error("Automatic preview deployment requires a gameshop/* branch.");
  const events:Array<Record<string,unknown>>=[];let deploymentId:string|undefined;
  if(cfg.deployHookUrl){const hook=new URL(cfg.deployHookUrl);if(hook.protocol!=="https:")throw new Error("Deploy Hook must use HTTPS.");const r=await fetch(hook,{method:"POST",signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`Deploy Hook failed (${r.status}).`);events.push({stage:"trigger",mode:"deploy-hook",status:r.status});}
  else if(token()&&cfg.name&&cfg.repoId){const url=api("/v13/deployments",cfg.teamId);url.searchParams.set("forceNew","1");const body={name:cfg.name,target:null,gitSource:{type:"github",repoId:cfg.repoId,ref:input.branch,...(input.commitSha?{sha:input.commitSha}:{})}};const created=await json(url,{method:"POST",headers:headers(),body:JSON.stringify(body)}) as Record<string,unknown>;deploymentId=String(created.id??created.uid??"")||undefined;events.push({stage:"trigger",mode:"rest-git-source",deploymentId:deploymentId??null,url:created.url??null});}
  else events.push({stage:"trigger",mode:"git-auto-preview-discovery",note:"Assuming repository Git integration creates previews on branch push."});
  await recordPreview({projectId:input.projectId,branch:input.branch,commitSha:input.commitSha,provider:"vercel",deploymentId,status:"triggered"}).catch(()=>{});
  await logEvent({type:"preview.triggered",projectId:input.projectId,data:{branch:input.branch,commitSha:input.commitSha??null,deploymentId:deploymentId??null}}).catch(()=>{});
  const waitMs=Math.max(0,Math.min(120000,input.waitMs??60000));const started=Date.now();
  do {
    if(token()){
      const url=api("/v6/deployments",cfg.teamId);url.searchParams.set("projectId",cfg.projectId);url.searchParams.set("limit","20");
      const body=await json(url,{headers:headers()}) as Record<string,unknown>;
      const deployments=Array.isArray(body.deployments)?body.deployments as Array<Record<string,unknown>>:[];
      const match=deployments.find(d=>{const meta=(d.meta??{}) as Record<string,unknown>;const branchMatches=String(meta.githubCommitRef??meta.gitBranch??"")===input.branch;const shaMatches=!input.commitSha||String(meta.githubCommitSha??meta.gitCommitSha??"")===input.commitSha;return branchMatches&&shaMatches;});
      if(match){
        const state=String(match.readyState??match.state??"");const hostname=String(match.url??"");const previewUrl=hostname?`https://${hostname}`:null;deploymentId=String(match.uid??match.id??deploymentId??"")||undefined;
        events.push({stage:"discover",state,previewUrl,id:deploymentId??null});
        if(/READY|ERROR|CANCELED/i.test(state)){
          const status=/READY/i.test(state)?"ready":"failed";
          await recordPreview({projectId:input.projectId,branch:input.branch,commitSha:input.commitSha,provider:"vercel",deploymentId,previewUrl:previewUrl??undefined,status}).catch(()=>{});
          await logEvent({type:`preview.${status}`,projectId:input.projectId,data:{branch:input.branch,commitSha:input.commitSha??null,previewUrl,deploymentId}}).catch(()=>{});
          return{status,projectId:project.id,branch:input.branch,commitSha:input.commitSha??null,previewUrl,deployment:match,events};
        }
      }
    }
    if(Date.now()-started>=waitMs)break;
    await new Promise(resolve=>setTimeout(resolve,5000));
  } while(true);
  await recordPreview({projectId:input.projectId,branch:input.branch,commitSha:input.commitSha,provider:"vercel",deploymentId,status:"pending"}).catch(()=>{});
  return{status:"pending",projectId:project.id,branch:input.branch,commitSha:input.commitSha??null,previewUrl:null,events,note:"Preview may still be building; call again to discover it."};
}

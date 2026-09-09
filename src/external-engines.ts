import { assertPaidGenerationAllowed } from "./spend.js";
import { createArtifact, listArtifacts, updateArtifact, type ArtifactKind, type ArtifactPurpose } from "./artifacts.js";

function secret(name:string){const value=process.env[name];if(!value)throw new Error(`${name} is not configured.`);return value;}
async function jsonRequest(url:string,init:RequestInit){const response=await fetch(url,{...init,signal:AbortSignal.timeout(30000)});const text=await response.text();let data:unknown=text;try{data=text?JSON.parse(text):null}catch{}if(!response.ok)throw new Error(`External engine request failed (${response.status}).`);return data;}
function record(data:unknown){return typeof data==="object"&&data!==null?data as Record<string,unknown>:{};}
function providerJobId(data:unknown){const r=record(data);return String(r.id??r.request_id??r.requestId??r.task_id??r.taskId??r.prediction_id??"")||undefined;}
function firstUrl(data:unknown):string|undefined{const seen=new Set<unknown>();const walk=(value:unknown):string|undefined=>{if(typeof value==="string"&&/^https?:\/\//.test(value))return value;if(!value||typeof value!=="object"||seen.has(value))return;seen.add(value);if(Array.isArray(value)){for(const item of value){const found=walk(item);if(found)return found;}return;}for(const item of Object.values(value as Record<string,unknown>)){const found=walk(item);if(found)return found;}};return walk(data);}
function terminalState(data:unknown):"ready"|"failed"|"pending"{const r=record(data);const raw=String(r.status??r.state??r.phase??"").toLowerCase();if(["succeeded","success","completed","complete","ready","finished"].includes(raw))return"ready";if(["failed","error","cancelled","canceled"].includes(raw))return"failed";return"pending";}
type ArtifactContext={executionId?:string;projectId?:string;purpose?:ArtifactPurpose;kind?:ArtifactKind;name?:string};
async function attach(provider:string,data:unknown,ctx?:ArtifactContext){if(!ctx?.executionId)return{result:data,artifact:null};const artifact=await createArtifact({executionId:ctx.executionId,projectId:ctx.projectId,kind:ctx.kind??"other",purpose:ctx.purpose??"general",status:"pending",name:ctx.name??`${provider} output`,provider,providerJobId:providerJobId(data),metadata:{providerResponse:data}});return{result:data,artifact};}
async function finalize(provider:string,jobId:string,data:unknown){const matches=(await listArtifacts()).filter(a=>a.provider===provider&&a.providerJobId===jobId);const status=terminalState(data);const sourceUrl=firstUrl(data);const updated=[];for(const artifact of matches){updated.push(await updateArtifact(artifact.artifactId,{status,sourceUrl:sourceUrl??artifact.sourceUrl,metadata:{providerResponse:data,lastStatusCheck:new Date().toISOString()}}));}return{result:data,artifacts:updated,status,sourceUrl:sourceUrl??null};}

export function externalEngineStatus(){return{
  meshy:{configured:Boolean(process.env.MESHY_API_KEY),mode:"rest",paid:true,artifactCapture:true,artifactFinalization:true},
  fal:{configured:Boolean(process.env.FAL_KEY),mode:"queue-api",paid:true,artifactCapture:true},
  replicate:{configured:Boolean(process.env.REPLICATE_API_TOKEN),mode:"rest+mcp",paid:true,artifactCapture:true,artifactFinalization:true},
  ludo:{configured:Boolean(process.env.LUDO_API_KEY),mode:"rest+mcp",paid:true},
  elevenlabs:{configured:Boolean(process.env.ELEVENLABS_API_KEY),mode:"hosted-mcp+api",paid:true},
};}

export async function meshyTextTo3D(input:{prompt:string;mode?:"preview"|"refine";previewTaskId?:string;enablePbr?:boolean;artifact?:ArtifactContext}){
  assertPaidGenerationAllowed("Meshy text-to-3D");
  const key=secret("MESHY_API_KEY");
  const body=input.mode==="refine"?{mode:"refine",preview_task_id:input.previewTaskId,enable_pbr:input.enablePbr??true}:{mode:"preview",prompt:input.prompt,target_formats:["glb"]};
  const data=await jsonRequest("https://api.meshy.ai/openapi/v2/text-to-3d",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body)});
  return attach("meshy",data,{kind:"3d",name:"Meshy 3D model",...input.artifact});
}
export async function meshyTask(id:string){const key=secret("MESHY_API_KEY");const data=await jsonRequest(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`}});return finalize("meshy",id,data);}

export async function falSubmit(input:{model:string;input:Record<string,unknown>;artifact?:ArtifactContext}){
  assertPaidGenerationAllowed("fal inference");
  const key=secret("FAL_KEY");
  if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+$/.test(input.model))throw new Error("Invalid fal model id.");
  const data=await jsonRequest(`https://queue.fal.run/${input.model}`,{method:"POST",headers:{Authorization:`Key ${key}`,"content-type":"application/json"},body:JSON.stringify(input.input)});
  return attach("fal",data,{name:`fal ${input.model} output`,...input.artifact});
}

export async function replicatePredict(input:{version:string;input:Record<string,unknown>;artifact?:ArtifactContext}){
  assertPaidGenerationAllowed("Replicate prediction");
  const token=secret("REPLICATE_API_TOKEN");
  const data=await jsonRequest("https://api.replicate.com/v1/predictions",{method:"POST",headers:{Authorization:`Token ${token}`,"content-type":"application/json","Prefer":"respond-async"},body:JSON.stringify({version:input.version,input:input.input})});
  return attach("replicate",data,{name:"Replicate prediction output",...input.artifact});
}
export async function replicatePrediction(id:string){const token=secret("REPLICATE_API_TOKEN");const data=await jsonRequest(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,{headers:{Authorization:`Token ${token}`}});return finalize("replicate",id,data);}

export async function ludoDocs(input:{doc?:string;sections?:string}){
  const key=secret("LUDO_API_KEY");const params=new URLSearchParams();if(input.doc)params.set("doc",input.doc);if(input.sections)params.set("sections",input.sections);
  const suffix=params.size?`?${params}`:"";
  return jsonRequest(`https://api.ludo.ai/api/docs${suffix}`,{headers:{Authorization:`ApiKey ${key}`}});
}

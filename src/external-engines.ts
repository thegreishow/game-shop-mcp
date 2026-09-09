import { assertPaidGenerationAllowed } from "./spend.js";
import { createArtifact, listArtifacts, updateArtifact, type ArtifactKind, type ArtifactPurpose } from "./artifacts.js";

function secret(name:string){const value=process.env[name];if(!value)throw new Error(`${name} is not configured.`);return value;}
async function rawRequest(url:string,init:RequestInit){const response=await fetch(url,{...init,signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`External engine request failed (${response.status}).`);return response;}
async function jsonRequest(url:string,init:RequestInit){const response=await rawRequest(url,init);const text=await response.text();let data:unknown=text;try{data=text?JSON.parse(text):null}catch{}return data;}
function record(data:unknown){return typeof data==="object"&&data!==null?data as Record<string,unknown>:{};}
function providerJobId(data:unknown){const r=record(data);return String(r.id??r.request_id??r.requestId??r.task_id??r.taskId??r.jobId??r.job_id??r.prediction_id??"")||undefined;}
function firstUrl(value:unknown):string|undefined{if(typeof value==="string"&&/^https:\/\//.test(value))return value;if(Array.isArray(value)){for(const v of value){const found=firstUrl(v);if(found)return found;}}if(value&&typeof value==="object"){for(const [k,v] of Object.entries(value as Record<string,unknown>)){if(/url|output|asset|model|audio|video|image|file/i.test(k)){const found=firstUrl(v);if(found)return found;}}for(const v of Object.values(value as Record<string,unknown>)){const found=firstUrl(v);if(found)return found;}}return undefined;}
type ArtifactContext={executionId?:string;projectId?:string;purpose?:ArtifactPurpose;kind?:ArtifactKind;name?:string};
async function attach(provider:string,data:unknown,ctx?:ArtifactContext){if(!ctx?.executionId)return{result:data,artifact:null};const artifact=await createArtifact({executionId:ctx.executionId,projectId:ctx.projectId,kind:ctx.kind??"other",purpose:ctx.purpose??"general",status:"pending",name:ctx.name??`${provider} output`,provider,providerJobId:providerJobId(data),metadata:{providerResponse:data}});return{result:data,artifact};}
async function finalize(provider:string,jobId:string,data:unknown,status:string){const artifacts=(await listArtifacts()).filter(a=>a.provider===provider&&a.providerJobId===jobId);const normalized=status.toLowerCase();const terminal=/succeed|complete|ready|finished/.test(normalized)?"ready":/fail|cancel|error/.test(normalized)?"failed":null;const sourceUrl=firstUrl(data);for(const a of artifacts)await updateArtifact(a.artifactId,{status:terminal??a.status,sourceUrl:sourceUrl??a.sourceUrl,metadata:{providerResponse:data,providerStatus:status}});return{result:data,artifactsUpdated:artifacts.length,status:terminal??"pending"};}

export function externalEngineStatus(){return{
 meshy:{configured:Boolean(process.env.MESHY_API_KEY),mode:"rest",paid:true,artifactCapture:true,artifactFinalization:true},
 fal:{configured:Boolean(process.env.FAL_KEY),mode:"queue-api",paid:true,artifactCapture:true,artifactFinalization:true},
 replicate:{configured:Boolean(process.env.REPLICATE_API_TOKEN),mode:"rest+mcp",paid:true,artifactCapture:true,artifactFinalization:true},
 ludo:{configured:Boolean(process.env.LUDO_API_KEY),mode:"remote-mcp",paid:true,artifactCapture:true},
 elevenlabs:{configured:Boolean(process.env.ELEVENLABS_API_KEY),mode:"async-flows+api",paid:true,artifactCapture:true,artifactFinalization:true},
 scenario:{configured:Boolean(process.env.SCENARIO_API_KEY),mode:"universal-rest",paid:true,artifactCapture:true},
};}

export async function meshyTextTo3D(input:{prompt:string;mode?:"preview"|"refine";previewTaskId?:string;enablePbr?:boolean;artifact?:ArtifactContext}){assertPaidGenerationAllowed("Meshy text-to-3D");const key=secret("MESHY_API_KEY");const body=input.mode==="refine"?{mode:"refine",preview_task_id:input.previewTaskId,enable_pbr:input.enablePbr??true}:{mode:"preview",prompt:input.prompt,target_formats:["glb"]};const data=await jsonRequest("https://api.meshy.ai/openapi/v2/text-to-3d",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body)});return attach("meshy",data,{kind:"3d",name:"Meshy 3D model",...input.artifact});}
export async function meshyTask(id:string){const key=secret("MESHY_API_KEY");const data=await jsonRequest(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`}});return finalize("meshy",id,data,String(record(data).status??"unknown"));}

export async function falSubmit(input:{model:string;input:Record<string,unknown>;artifact?:ArtifactContext}){assertPaidGenerationAllowed("fal inference");const key=secret("FAL_KEY");if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+$/.test(input.model))throw new Error("Invalid fal model id.");const data=await jsonRequest(`https://queue.fal.run/${input.model}`,{method:"POST",headers:{Authorization:`Key ${key}`,"content-type":"application/json"},body:JSON.stringify(input.input)});return attach("fal",data,{name:`fal ${input.model} output`,...input.artifact});}
function falUrl(url:string){const parsed=new URL(url);if(parsed.protocol!=="https:"||parsed.hostname!=="queue.fal.run")throw new Error("Only queue.fal.run job URLs are allowed.");return parsed.toString();}
export async function falJob(input:{jobId:string;statusUrl:string;responseUrl?:string}){const key=secret("FAL_KEY");const statusData=await jsonRequest(falUrl(input.statusUrl),{headers:{Authorization:`Key ${key}`}});const status=String(record(statusData).status??"unknown");if(/COMPLETED|SUCCEEDED/i.test(status)&&input.responseUrl){const result=await jsonRequest(falUrl(input.responseUrl),{headers:{Authorization:`Key ${key}`}});return finalize("fal",input.jobId,result,"completed");}return finalize("fal",input.jobId,statusData,status);}

export async function replicatePredict(input:{version:string;input:Record<string,unknown>;artifact?:ArtifactContext}){assertPaidGenerationAllowed("Replicate prediction");const token=secret("REPLICATE_API_TOKEN");const data=await jsonRequest("https://api.replicate.com/v1/predictions",{method:"POST",headers:{Authorization:`Token ${token}`,"content-type":"application/json","Prefer":"respond-async"},body:JSON.stringify({version:input.version,input:input.input})});return attach("replicate",data,{name:"Replicate prediction output",...input.artifact});}
export async function replicatePrediction(id:string){const token=secret("REPLICATE_API_TOKEN");const data=await jsonRequest(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,{headers:{Authorization:`Token ${token}`}});return finalize("replicate",id,data,String(record(data).status??"unknown"));}

async function ludoMcp(tool:string,args:Record<string,unknown>){
 const key=secret("LUDO_API_KEY");
 const endpoint="https://mcp.ludo.ai/mcp";
 const headers:Record<string,string>={Authorization:`ApiKey ${key}`,Authentication:`ApiKey ${key}`,"content-type":"application/json",Accept:"application/json, text/event-stream"};
 const initialize={jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"game-shop-mcp",version:"0.2.0"}}};
 const init=await rawRequest(endpoint,{method:"POST",headers,body:JSON.stringify(initialize)});
 const session=init.headers.get("mcp-session-id");
 await init.text();
 const callHeaders:Record<string,string>=session?{...headers,"mcp-session-id":session}:headers;
 const call={jsonrpc:"2.0",id:2,method:"tools/call",params:{name:tool,arguments:args}};
 const response=await rawRequest(endpoint,{method:"POST",headers:callHeaders,body:JSON.stringify(call)});
 const text=await response.text();
 if(text.startsWith("event:")){const dataLine=text.split("\n").find(line=>line.startsWith("data:"));return dataLine?JSON.parse(dataLine.slice(5).trim()):{raw:text};}
 return JSON.parse(text);
}
const LUDO_GENERATORS=new Set(["createImage","editImage","generateWithStyle","generatePose","removeBackground","create3DModel","animateSprite","animateSpriteKeyframes","editSpritesheet","createVideo","createVideoFromReferences","editVideo","upscaleVideo","createSoundEffect","createMusic","createVoice","createSpeech","createSpeechPreset"]);
export async function ludoGenerate(input:{tool:string;input:Record<string,unknown>;artifact?:ArtifactContext}){assertPaidGenerationAllowed("Ludo generation");if(!LUDO_GENERATORS.has(input.tool))throw new Error("Unsupported Ludo generation tool.");const data=await ludoMcp(input.tool,input.input);return attach("ludo",data,{name:`Ludo ${input.tool} output`,...input.artifact});}
export async function ludoJob(input:{id:string;wait?:number}){const data=await ludoMcp("getApiJob",{id:input.id,wait:Math.max(0,Math.min(60,input.wait??0))});const root=record(data);const result=record(root.result);const structured=record(result.structuredContent);const payload=Object.keys(structured).length?structured:data;const status=String(record(payload).status??root.status??"unknown");return finalize("ludo",input.id,payload,status);}
export async function ludoDocs(input:{doc?:string;sections?:string}){const key=secret("LUDO_API_KEY");const params=new URLSearchParams();if(input.doc)params.set("doc",input.doc);if(input.sections)params.set("sections",input.sections);const suffix=params.size?`?${params}`:"";return jsonRequest(`https://api.ludo.ai/api/docs${suffix}`,{headers:{Authorization:`ApiKey ${key}`}});}

export async function elevenSpeech(input:{text:string;voice:string;modelId?:string;artifact?:ArtifactContext}){assertPaidGenerationAllowed("ElevenLabs speech");const key=secret("ELEVENLABS_API_KEY");const data=await jsonRequest("https://api.elevenlabs.io/v1/flows/text-to-speech",{method:"POST",headers:{"xi-api-key":key,"content-type":"application/json"},body:JSON.stringify({model_id:input.modelId??"eleven_multilingual_v2",text:input.text,voice:input.voice})});return attach("elevenlabs",data,{kind:"audio",name:"ElevenLabs speech",...input.artifact});}
export async function elevenSpeechJob(id:string){const key=secret("ELEVENLABS_API_KEY");const data=await jsonRequest(`https://api.elevenlabs.io/v1/flows/text-to-speech/${encodeURIComponent(id)}`,{headers:{"xi-api-key":key}});return finalize("elevenlabs",id,data,String(record(data).status??"unknown"));}

export async function scenarioGenerate(input:{modelId:string;body:Record<string,unknown>;artifact?:ArtifactContext}){assertPaidGenerationAllowed("Scenario generation");const key=secret("SCENARIO_API_KEY");if(!/^model_[a-zA-Z0-9_-]+$/.test(input.modelId))throw new Error("Invalid Scenario model id.");const data=await jsonRequest(`https://api.cloud.scenario.com/v1/generate/custom/${encodeURIComponent(input.modelId)}`,{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(input.body)});return attach("scenario",data,{name:`Scenario ${input.modelId} output`,...input.artifact});}

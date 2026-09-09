import { assertPaidGenerationAllowed } from "./spend.js";

function secret(name:string){const value=process.env[name];if(!value)throw new Error(`${name} is not configured.`);return value;}
async function jsonRequest(url:string,init:RequestInit){const response=await fetch(url,{...init,signal:AbortSignal.timeout(30000)});const text=await response.text();let data:unknown=text;try{data=text?JSON.parse(text):null}catch{}if(!response.ok)throw new Error(`External engine request failed (${response.status}).`);return data;}

export function externalEngineStatus(){return{
  meshy:{configured:Boolean(process.env.MESHY_API_KEY),mode:"rest",paid:true},
  fal:{configured:Boolean(process.env.FAL_KEY),mode:"queue-api",paid:true},
  replicate:{configured:Boolean(process.env.REPLICATE_API_TOKEN),mode:"rest+mcp",paid:true},
  ludo:{configured:Boolean(process.env.LUDO_API_KEY),mode:"rest+mcp",paid:true},
  elevenlabs:{configured:Boolean(process.env.ELEVENLABS_API_KEY),mode:"hosted-mcp+api",paid:true},
};}

export async function meshyTextTo3D(input:{prompt:string;mode?:"preview"|"refine";previewTaskId?:string;enablePbr?:boolean}){
  assertPaidGenerationAllowed("Meshy text-to-3D");
  const key=secret("MESHY_API_KEY");
  const body=input.mode==="refine"?{mode:"refine",preview_task_id:input.previewTaskId,enable_pbr:input.enablePbr??true}:{mode:"preview",prompt:input.prompt,target_formats:["glb"]};
  return jsonRequest("https://api.meshy.ai/openapi/v2/text-to-3d",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(body)});
}
export async function meshyTask(id:string){const key=secret("MESHY_API_KEY");return jsonRequest(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`}});}

export async function falSubmit(input:{model:string;input:Record<string,unknown>}){
  assertPaidGenerationAllowed("fal inference");
  const key=secret("FAL_KEY");
  if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+$/.test(input.model))throw new Error("Invalid fal model id.");
  return jsonRequest(`https://queue.fal.run/${input.model}`,{method:"POST",headers:{Authorization:`Key ${key}`,"content-type":"application/json"},body:JSON.stringify(input.input)});
}

export async function replicatePredict(input:{version:string;input:Record<string,unknown>}){
  assertPaidGenerationAllowed("Replicate prediction");
  const token=secret("REPLICATE_API_TOKEN");
  return jsonRequest("https://api.replicate.com/v1/predictions",{method:"POST",headers:{Authorization:`Token ${token}`,"content-type":"application/json","Prefer":"respond-async"},body:JSON.stringify({version:input.version,input:input.input})});
}
export async function replicatePrediction(id:string){const token=secret("REPLICATE_API_TOKEN");return jsonRequest(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,{headers:{Authorization:`Token ${token}`}});}

export async function ludoDocs(input:{doc?:string;sections?:string}){
  const key=secret("LUDO_API_KEY");const params=new URLSearchParams();if(input.doc)params.set("doc",input.doc);if(input.sections)params.set("sections",input.sections);
  const suffix=params.size?`?${params}`:"";
  return jsonRequest(`https://api.ludo.ai/api/docs${suffix}`,{headers:{Authorization:`ApiKey ${key}`}});
}

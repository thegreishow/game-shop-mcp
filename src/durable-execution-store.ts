import type { StoredExecution } from "./execution-store.js";

function config(){
  const url=process.env.GAME_SHOP_SUPABASE_URL?.replace(/\/$/,"");
  const key=process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
  return url&&key?{url,key}:null;
}
function headers(key:string){return{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"};}
function row(execution:StoredExecution){return{execution_id:execution.executionId,plan_digest:execution.planDigest,project_id:execution.projectId,mode:execution.mode,status:execution.status,completed_operations:execution.completedOperations,total_operations:execution.totalOperations,last_error:execution.lastError??null,operation_results:execution.operationResults,created_at:execution.createdAt,updated_at:execution.updatedAt};}
function fromRow(value:Record<string,unknown>):StoredExecution{return{executionId:String(value.execution_id),planDigest:String(value.plan_digest),projectId:String(value.project_id),mode:value.mode as StoredExecution["mode"],status:value.status as StoredExecution["status"],completedOperations:Number(value.completed_operations),totalOperations:Number(value.total_operations),lastError:typeof value.last_error==="string"?value.last_error:undefined,operationResults:Array.isArray(value.operation_results)?value.operation_results as Array<Record<string,unknown>>:[],createdAt:String(value.created_at),updatedAt:String(value.updated_at)}}
async function request(path:string,init?:RequestInit){const cfg=config();if(!cfg)throw new Error("Durable execution storage is not configured.");const response=await fetch(`${cfg.url}/rest/v1/game_shop_executions${path}`,{...init,headers:{...headers(cfg.key),...(init?.headers??{})},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Execution store request failed (${response.status}).`);const text=await response.text();return text?JSON.parse(text):null;}

export function durableExecutionConfigured(){return Boolean(config());}
export async function persistExecution(execution:StoredExecution){await request("?on_conflict=execution_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(row(execution))});return execution;}
export async function loadExecution(executionId:string){const data=await request(`?execution_id=eq.${encodeURIComponent(executionId)}&limit=1`,{headers:{Accept:"application/json"}}) as Record<string,unknown>[];return data[0]?fromRow(data[0]):null;}
export async function loadExecutions(limit=50){const data=await request(`?select=*&order=updated_at.desc&limit=${Math.min(Math.max(limit,1),100)}`,{headers:{Accept:"application/json"}}) as Record<string,unknown>[];return data.map(fromRow);}

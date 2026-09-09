import { durableExecutionConfigured, loadExecution, loadExecutions, persistExecution } from "./durable-execution-store.js";

export type StoredExecutionStatus = "planned" | "running" | "input_required" | "completed" | "failed" | "cancelled";
export type StoredExecution = { executionId:string; planDigest:string; projectId:string; mode:"dry-run"|"execute"; status:StoredExecutionStatus; createdAt:string; updatedAt:string; completedOperations:number; totalOperations:number; lastError?:string; operationResults:Array<Record<string,unknown>> };
const executions = new Map<string, StoredExecution>();

async function persist(value:StoredExecution){executions.set(value.executionId,value);if(durableExecutionConfigured())await persistExecution(value);return value;}
export async function saveExecution(execution:StoredExecution){return persist(execution);}
export async function getExecution(executionId:string){const warm=executions.get(executionId);if(warm)return warm;if(!durableExecutionConfigured())return null;const durable=await loadExecution(executionId);if(durable)executions.set(executionId,durable);return durable;}
export async function listExecutions(){if(durableExecutionConfigured()){const durable=await loadExecutions();for(const item of durable)executions.set(item.executionId,item);return durable;}return [...executions.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export async function updateExecution(executionId:string,patch:Partial<Omit<StoredExecution,"executionId"|"createdAt">>){const current=await getExecution(executionId);if(!current)return null;const next:StoredExecution={...current,...patch,executionId,createdAt:current.createdAt,updatedAt:new Date().toISOString()};return persist(next);}
export async function cancelExecution(executionId:string){return updateExecution(executionId,{status:"cancelled"});}
export function executionStoreInfo(){const durable=durableExecutionConfigured();return{backend:durable?"supabase-postgres":"process-memory",durableAcrossColdStarts:durable,configured:durable,note:durable?"Execution lifecycle is persisted through the server-side Supabase REST adapter.":"Durable store credentials are not configured; execution state is warm-process only."};}

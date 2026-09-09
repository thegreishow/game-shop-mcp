import { durableExecutionConfigured, loadExecution, loadExecutions, persistExecution } from "./durable-execution-store.js";

export type StoredExecutionStatus = "planned" | "running" | "input_required" | "completed" | "failed" | "cancelled";
export type StoredExecution = { executionId:string; planDigest:string; projectId:string; mode:"dry-run"|"execute"; status:StoredExecutionStatus; createdAt:string; updatedAt:string; completedOperations:number; totalOperations:number; lastError?:string; operationResults:Array<Record<string,unknown>> };
const executions=new Map<string,StoredExecution>();
function cache(value:StoredExecution){executions.set(value.executionId,value);return value;}
async function persist(value:StoredExecution){cache(value);if(durableExecutionConfigured())await persistExecution(value);return value;}

// Warm-cache compatibility for existing MCP handlers.
export function getExecution(executionId:string){return executions.get(executionId)??null;}
export function listExecutions(){return[...executions.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function cancelExecution(executionId:string){const current=getExecution(executionId);if(!current)return null;const next={...current,status:"cancelled" as const,updatedAt:new Date().toISOString()};cache(next);if(durableExecutionConfigured())void persistExecution(next);return next;}

// Durable lifecycle used by workers and new status/repair surfaces.
export async function resolveExecution(executionId:string){const warm=getExecution(executionId);if(warm)return warm;if(!durableExecutionConfigured())return null;const durable=await loadExecution(executionId);return durable?cache(durable):null;}
export async function resolveExecutions(){if(!durableExecutionConfigured())return listExecutions();const durable=await loadExecutions();for(const item of durable)cache(item);return durable;}
export async function saveExecution(execution:StoredExecution){return persist(execution);}
export async function updateExecution(executionId:string,patch:Partial<Omit<StoredExecution,"executionId"|"createdAt">>){const current=await resolveExecution(executionId);if(!current)return null;return persist({...current,...patch,executionId,createdAt:current.createdAt,updatedAt:new Date().toISOString()});}
export async function cancelExecutionDurable(executionId:string){return updateExecution(executionId,{status:"cancelled"});}
export function executionStoreInfo(){const durable=durableExecutionConfigured();return{backend:durable?"supabase-postgres":"process-memory",durableAcrossColdStarts:durable,configured:durable,note:durable?"Execution lifecycle persists through the server-side Supabase adapter.":"Durable credentials are not configured; execution state is warm-process only."};}

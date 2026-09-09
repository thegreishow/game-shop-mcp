export type StoredExecutionStatus = "planned" | "running" | "input_required" | "completed" | "failed" | "cancelled";
export type StoredExecution = { executionId:string; planDigest:string; projectId:string; mode:"dry-run"|"execute"; status:StoredExecutionStatus; createdAt:string; updatedAt:string; completedOperations:number; totalOperations:number; lastError?:string; operationResults:Array<Record<string,unknown>> };
const executions = new Map<string, StoredExecution>();
export function saveExecution(execution: StoredExecution){executions.set(execution.executionId,execution);return execution;}
export function getExecution(executionId:string){return executions.get(executionId)??null;}
export function listExecutions(){return [...executions.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function updateExecution(executionId:string,patch:Partial<Omit<StoredExecution,"executionId"|"createdAt">>){const current=executions.get(executionId);if(!current)return null;const next:StoredExecution={...current,...patch,executionId,createdAt:current.createdAt,updatedAt:new Date().toISOString()};executions.set(executionId,next);return next;}
export function cancelExecution(executionId:string){return updateExecution(executionId,{status:"cancelled"});}
export function executionStoreInfo(){return{backend:"process-memory",durableAcrossColdStarts:false,note:"Execution handles are resumable within a warm Game Shop process. Replace this adapter with a durable store before relying on cross-cold-start persistence."};}

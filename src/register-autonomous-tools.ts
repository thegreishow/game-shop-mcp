import { z } from "zod";
import {
  attachAutonomousJobArtifact,
  autonomousJobInfo,
  autonomousJobStatus,
  cancelAutonomousJob,
  createAutonomousJob,
  judgeAutonomousJob,
  listAutonomousJobs,
  prepareAutonomousJobBranch,
  recordAutonomousJobChange,
  recordAutonomousRepairResult,
  shipAutonomousJob,
} from "./autonomous-job.js";
import { publicErrorMessage } from "./errors.js";

function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}};}
function fail(error:unknown){return{isError:true,content:[{type:"text" as const,text:publicErrorMessage(error)}]};}
function safe(fn:(input:any)=>unknown|Promise<unknown>){return async(input:any)=>{try{return result(await fn(input));}catch(error){return fail(error);}};}

const autonomy=z.enum(["observe","plan","execute","repair","ship"]);
const assertion=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("selector-visible"),selector:z.string().min(1).max(500)}),
 z.object({kind:z.literal("selector-text"),selector:z.string().min(1).max(500),includes:z.string().min(1).max(500)}),
 z.object({kind:z.literal("title-includes"),includes:z.string().min(1).max(300)}),
 z.object({kind:z.literal("url-includes"),includes:z.string().min(1).max(500)}),
 z.object({kind:z.literal("body-min-text"),min:z.number().int().min(0).max(1000000)}),
 z.object({kind:z.literal("element-count"),selector:z.string().min(1).max(500),min:z.number().int().min(0).max(10000)}),
 z.object({kind:z.literal("canvas-ready"),selector:z.string().min(1).max(500).optional()}),
]);
const checks=z.array(z.object({path:z.string().min(1).max(500),required:z.boolean().optional(),contains:z.string().max(500).optional()})).max(25).optional();
const interactions=z.array(z.string().max(300)).max(8).optional();
const artifact=z.object({kind:z.string().min(1).max(100),name:z.string().max(300).optional(),path:z.string().max(500).optional(),url:z.string().url().max(2000).optional(),provider:z.string().max(100).optional(),accepted:z.boolean().optional(),metadata:z.record(z.string(),z.unknown()).optional()});

export function registerAutonomousTools(server:any){
 server.registerTool("gameshop_autonomous_job_info",{title:"Autonomous Job Protocol",description:"Describe the canonical autonomous execution protocol, autonomy levels, Playwright browser authority, bounded repair loop and human-controlled merge invariant.",inputSchema:z.object({}),annotations:{readOnlyHint:true}},safe(async()=>autonomousJobInfo()));
 server.registerTool("gameshop_create_autonomous_job",{title:"Create Autonomous Job",description:"Create a canonical execution with goal, project/repo, constraints, budget, autonomy level, evidence, failures, repairs and outcome state. No project mutation occurs during creation.",inputSchema:z.object({goal:z.string().min(1).max(2000),projectId:z.string().min(1).max(100),autonomy:autonomy.default("plan"),constraints:z.array(z.string().max(500)).max(30).optional(),budgetUsd:z.number().min(0).max(100000).optional(),providerBudgets:z.record(z.string(),z.number().min(0)).optional(),maxRepairAttempts:z.number().int().min(1).max(5).optional(),baseRef:z.string().max(200).optional(),branch:z.string().regex(/^gameshop\//).optional()}),annotations:{readOnlyHint:false}},safe(createAutonomousJob));
 server.registerTool("gameshop_autonomous_job_status",{title:"Autonomous Job Status",description:"Read one canonical autonomous execution, including browser evidence, failures, repair budget, artifacts, outcome and spend state.",inputSchema:z.object({executionId:z.string().min(8).max(100)}),annotations:{readOnlyHint:true}},safe(async({executionId}:any)=>autonomousJobStatus(executionId)));
 server.registerTool("gameshop_autonomous_jobs",{title:"Autonomous Jobs",description:"List recent canonical autonomous executions reconstructed from the execution event ledger.",inputSchema:z.object({limit:z.number().int().min(1).max(100).optional()}),annotations:{readOnlyHint:true}},safe(async({limit}:any)=>({jobs:await listAutonomousJobs(limit)})));
 server.registerTool("gameshop_autonomous_job_prepare_branch",{title:"Prepare Autonomous Job Branch",description:"At execute/repair/ship autonomy, create or reuse the controlled gameshop/* branch for the job. GitHub writes remain independently gated.",inputSchema:z.object({executionId:z.string().min(8).max(100)}),annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true}},safe(async({executionId}:any)=>prepareAutonomousJobBranch(executionId)));
 server.registerTool("gameshop_autonomous_job_record_change",{title:"Record Autonomous Job Change",description:"Bind a code/artifact change commit to an autonomous job before preview and browser judgement.",inputSchema:z.object({executionId:z.string().min(8).max(100),commitSha:z.string().min(7).max(64),summary:z.string().max(1000).optional(),artifacts:z.array(artifact).max(25).optional()}),annotations:{readOnlyHint:false}},safe(recordAutonomousJobChange));
 server.registerTool("gameshop_autonomous_job_judge",{title:"Judge Autonomous Job",description:"Run structural checks and Playwright-authoritative Chromium QA. Web/game jobs cannot finish green from code inspection alone; failed jobs are classified and may enter a bounded repair loop.",inputSchema:z.object({executionId:z.string().min(8).max(100),url:z.string().url().optional(),provider:z.enum(["playwright-mcp","browserbase"]).optional(),checks,interactions,assertions:z.array(assertion).max(20).optional(),autoPreview:z.boolean().optional()}),annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true}},safe(judgeAutonomousJob));
 server.registerTool("gameshop_autonomous_job_repair_result",{title:"Record Autonomous Repair Result",description:"Record a Codex/repair-engine patch result, bind its commit, and move the bounded loop back toward preview and Playwright re-judgement.",inputSchema:z.object({executionId:z.string().min(8).max(100),status:z.enum(["applied","failed"]),commitSha:z.string().min(7).max(64).optional(),summary:z.string().max(1000).optional()}),annotations:{readOnlyHint:false}},safe(recordAutonomousRepairResult));
 server.registerTool("gameshop_autonomous_job_attach_artifact",{title:"Attach Autonomous Job Artifact",description:"Attach a generated or code artifact and its acceptance state to the canonical execution.",inputSchema:z.object({executionId:z.string().min(8).max(100),kind:z.string().min(1).max(100),name:z.string().max(300).optional(),path:z.string().max(500).optional(),url:z.string().url().max(2000).optional(),provider:z.string().max(100).optional(),accepted:z.boolean().optional(),metadata:z.record(z.string(),z.unknown()).optional()}),annotations:{readOnlyHint:false}},safe(attachAutonomousJobArtifact));
 server.registerTool("gameshop_autonomous_job_ship",{title:"Ship Autonomous Job",description:"After authoritative browser QA passes, verify project scope and open a pull request. This tool never merges the PR; merge remains human-controlled.",inputSchema:z.object({executionId:z.string().min(8).max(100)}),annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true}},safe(async({executionId}:any)=>shipAutonomousJob(executionId)));
 server.registerTool("gameshop_autonomous_job_cancel",{title:"Cancel Autonomous Job",description:"Cancel the canonical execution and record a terminal outcome.",inputSchema:z.object({executionId:z.string().min(8).max(100)}),annotations:{readOnlyHint:false,idempotentHint:true}},safe(async({executionId}:any)=>cancelAutonomousJob(executionId)));
}

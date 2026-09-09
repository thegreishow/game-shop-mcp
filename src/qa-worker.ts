import { getProject } from "./projects.js";
import { verifyProject, createRepairPlan, type VerificationCheck } from "./verification.js";

export type BrowserQaProvider="browserbase"|"playwright-mcp";
export type QaFinding={kind:"console"|"network"|"visual"|"interaction"|"performance"|"structural";severity:"info"|"warning"|"error";message:string;evidence?:Record<string,unknown>};
export type QaRun={projectId:string;ref:string;provider:BrowserQaProvider;status:"passed"|"failed"|"blocked";startedAt:string;completedAt:string;findings:QaFinding[];structural:unknown;repair?:unknown;requiresApproval:boolean};

function providerStatus(){return{
 browserbase:{configured:Boolean(process.env.BROWSERBASE_API_KEY&&process.env.BROWSERBASE_PROJECT_ID),remote:true,capabilities:["browser-session","screenshot","console","network","interaction","stagehand"]},
 playwrightMcp:{configured:Boolean(process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL),remote:Boolean(process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL),capabilities:["chromium","firefox","webkit","accessibility-tree","interaction","screenshot"]},
};}
export function qaWorkerInfo(){return{mode:"evidence-first",providers:providerStatus(),policy:{repairsRequireApproval:true,writeGate:"GAME_SHOP_ALLOW_GITHUB_WRITES",maxRepairCycles:3},evidence:["structural-checks","browser-console","network-failures","screenshots","interaction-results","performance-signals"]};}

async function browserProbe(input:{projectId:string;ref:string;url?:string;provider?:BrowserQaProvider}){
 const provider=input.provider??(process.env.BROWSERBASE_API_KEY?"browserbase":"playwright-mcp");
 const findings:QaFinding[]=[];
 if(!input.url){findings.push({kind:"interaction",severity:"warning",message:"No preview URL supplied; browser QA deferred until a deploy/preview URL exists."});return{provider,blocked:true,findings};}
 if(provider==="browserbase"&&!providerStatus().browserbase.configured){findings.push({kind:"interaction",severity:"warning",message:"Browserbase credentials are not configured."});return{provider,blocked:true,findings};}
 if(provider==="playwright-mcp"&&!providerStatus().playwrightMcp.configured){findings.push({kind:"interaction",severity:"warning",message:"Playwright MCP endpoint is not configured."});return{provider,blocked:true,findings};}
 // Transport-specific execution is deliberately isolated behind the QA provider adapter. The worker records a runnable contract now; deployed adapters execute it without granting arbitrary shell access.
 findings.push({kind:"interaction",severity:"info",message:"Browser QA contract prepared.",evidence:{url:input.url,provider,projectId:input.projectId,ref:input.ref,actions:["open","wait-for-settle","capture-console","capture-network-errors","screenshot","exercise-primary-interactions"]}});
 return{provider,blocked:false,findings};
}

export async function runQa(input:{projectId:string;ref?:string;url?:string;provider?:BrowserQaProvider;checks?:VerificationCheck[]}){
 const project=getProject(input.projectId);const ref=input.ref??project.defaultBranch;const startedAt=new Date().toISOString();
 const structural=await verifyProject({projectId:input.projectId,ref,checks:input.checks});
 const browser=await browserProbe({projectId:input.projectId,ref,url:input.url,provider:input.provider});
 const findings=[...browser.findings];if(structural.status!=="passed")for(const check of structural.checks.filter(c=>c.ok!==true))findings.push({kind:"structural",severity:"error",message:`Structural verification failed: ${String(check.path)}`,evidence:check});
 const failed=structural.status!=="passed"||findings.some(f=>f.severity==="error");const repair=failed?createRepairPlan({projectId:input.projectId,verification:structural}):undefined;
 return{projectId:input.projectId,ref,provider:browser.provider,status:failed?"failed":browser.blocked?"blocked":"passed",startedAt,completedAt:new Date().toISOString(),findings,structural,repair,requiresApproval:Boolean(failed)} satisfies QaRun;
}

export function repairWorkerContract(input:{projectId:string;qa:QaRun;approved:boolean}){
 if(!input.approved)return{status:"blocked",reason:"repair-approval-required",projectId:input.projectId};
 if(input.qa.status!=="failed")return{status:"clean",projectId:input.projectId};
 return{status:"approved",projectId:input.projectId,maxCycles:3,strategy:"smallest-safe-patch",loop:["inspect-evidence","prepare-controlled-patch","apply-on-gameshop-branch","rerun-structural-qa","rerun-browser-qa","stop-when-green"],writeGate:"GAME_SHOP_ALLOW_GITHUB_WRITES",repair:input.qa.repair,findings:input.qa.findings};
}

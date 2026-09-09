import { runQa } from "./qa-worker.js";
import { executeBrowserQa } from "./browser-adapters.js";
import { dispatchPlaywrightCi,playwrightCiInfo } from "./playwright-ci.js";
import type { VerificationCheck } from "./verification.js";

export type QaGate="green"|"provisional"|"blocked"|"red";
function countErrors(value:unknown){const row=value as Record<string,unknown>|null;const findings=Array.isArray(row?.findings)?row!.findings as Array<Record<string,unknown>>:[];return findings.filter(f=>f.severity==="error").length;}
export function qaSwarmInfo(){return{mode:"multi-lane-evidence-fusion",lanes:{structural:"github-source",browserbase:"hosted-stagehand-mcp",playwrightRemote:"streamable-http-mcp",playwrightCi:playwrightCiInfo(),chromeDevtools:"candidate-next-lane"},gate:{green:"all required live lanes passed and deterministic Playwright is explicitly not required or already represented by a live remote lane",provisional:"live QA passed but deterministic Playwright CI is queued or unavailable",red:"one or more error findings",blocked:"no runnable browser target"}};}
export async function runQaSwarm(input:{projectId:string;ref?:string;url?:string;checks?:VerificationCheck[];interactions?:string[];autoPreview?:boolean;queuePlaywrightCi?:boolean}){
 const requireCi=input.queuePlaywrightCi??true;
 const primary=await runQa({projectId:input.projectId,ref:input.ref,url:input.url,provider:process.env.BROWSERBASE_API_KEY?"browserbase":"playwright-mcp",checks:input.checks,interactions:input.interactions,autoPreview:input.autoPreview??true});
 const target=primary.url?String(primary.url):null;const lanes:Record<string,unknown>={primary};let errorCount=countErrors(primary);let ci:unknown=null;let remotePlaywright:unknown=null;let deterministicCovered=false;
 if(target&&process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL){try{remotePlaywright=await executeBrowserQa({url:target,provider:"playwright-mcp",interactions:input.interactions});lanes.playwrightRemote=remotePlaywright;const errors=(remotePlaywright as Awaited<ReturnType<typeof executeBrowserQa>>).errors.length;errorCount+=errors;deterministicCovered=errors===0;}catch(error){errorCount++;lanes.playwrightRemote={status:"failed",error:error instanceof Error?error.message:String(error)};}}
 if(target&&requireCi){if(process.env.GITHUB_TOKEN){try{ci=await dispatchPlaywrightCi({url:target,projectId:input.projectId,interactions:input.interactions});lanes.playwrightCi=ci;}catch(error){lanes.playwrightCi={status:"unavailable",error:error instanceof Error?error.message:String(error)};}}else lanes.playwrightCi={status:"not-configured",reason:"GITHUB_TOKEN is required for workflow dispatch."};}
 let gate:QaGate;if(!target)gate="blocked";else if(errorCount>0||primary.status==="failed")gate="red";else if(requireCi&&!deterministicCovered)gate="provisional";else gate="green";
 const confidence=gate==="green"?1:gate==="provisional"?.8:gate==="blocked"?.25:0;
 return{schemaVersion:"1.1",projectId:input.projectId,ref:primary.ref,url:target,gate,confidence,errorCount,lanes,release:{allowed:gate==="green",reason:gate==="green"?"QA release gate is green.":gate==="provisional"?"Live QA passed; deterministic Playwright validation remains pending/unavailable.":gate==="blocked"?"No preview/browser target is available.":"QA evidence contains errors."},info:qaSwarmInfo()};
}

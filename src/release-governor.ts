import { replayProjectRegressions } from "./qa-replay.js";
import { listQaRecipes } from "./qa-memory.js";
import { trustedCapabilities } from "./capability-trust.js";
import { orchestrationSnapshot } from "./orchestrator.js";
import { listQaEvidence } from "./qa-evidence.js";

export function releaseGovernorInfo(){return{mode:"strict-persisted-evidence-gate",decision:["green","provisional","blocked","red"],requirements:["no failed or repair-required orchestration for target project","structural verification terminal + green","browser evidence terminal + green when a browser target is required","deterministic Playwright terminal + green when required","Chrome diagnostics terminal + green when triggered","approved regression memory green","tested evidence must match requested commit SHA when one is supplied"],rules:{missing:"blocked",queuedOrRunning:"provisional",failed:"red",allRequiredGreen:"green"},policy:"The governor returns a decision; it never promotes a production deployment by itself."};}

export async function evaluateRelease(input:{projectId:string;url?:string;ref?:string;runRegressions?:boolean;queuePlaywrightCi?:boolean;commitSha?:string}){
 const orchestration=await orchestrationSnapshot();const projectRows=orchestration.rows.filter(r=>r.projectId===input.projectId);const bad=projectRows.filter(r=>{const state=String((r.orchestration as Record<string,unknown>).state??"");return state==="failed"||state==="repair_required";});
 const recipes=await listQaRecipes({projectId:input.projectId,approvedOnly:true});let regressions:Awaited<ReturnType<typeof replayProjectRegressions>>|null=null;
 if((input.runRegressions??true)&&recipes.length)regressions=await replayProjectRegressions({projectId:input.projectId,url:input.url,ref:input.ref,queuePlaywrightCi:input.queuePlaywrightCi??true,autoPreview:true});
 const allEvidence=await listQaEvidence({projectId:input.projectId,limit:200});
 const matching=allEvidence.filter(e=>!input.commitSha||e.commitSha===input.commitSha);
 const latest=(provider:string)=>matching.find(e=>e.provider===provider)??null;
 const structural=latest("structural");
 const browserbase=latest("browserbase");
 const playwrightRemote=latest("playwright-mcp");
 const playwrightCi=latest("playwright-ci");
 const chrome=latest("chrome-devtools-mcp");
 const requireBrowser=Boolean(input.url)||Boolean(browserbase)||Boolean(playwrightRemote);
 const requireCi=input.queuePlaywrightCi??true;
 const chromeTriggered=Boolean(chrome);
 const evidenceSet=[structural,...(requireBrowser?[browserbase??playwrightRemote]:[]),...(requireCi?[playwrightCi]:[]),...(chromeTriggered?[chrome]:[])].filter(Boolean);
 const failedEvidence=evidenceSet.filter(e=>e?.status==="failed"||e?.status==="blocked");
 const pendingEvidence=evidenceSet.filter(e=>e?.status==="queued"||e?.status==="running");
 const missing:string[]=[];
 if(!structural)missing.push("structural");
 if(requireBrowser&&!browserbase&&!playwrightRemote)missing.push("browser");
 if(requireCi&&!playwrightCi)missing.push("playwright-ci");
 if(chromeTriggered&&!chrome)missing.push("chrome-devtools-mcp");

 let decision:"green"|"provisional"|"blocked"|"red";const reasons:string[]=[];
 if(bad.length){decision="red";reasons.push(`${bad.length} orchestration item(s) are failed or awaiting repair.`);}
 else if(failedEvidence.length){decision="red";reasons.push(`${failedEvidence.length} required QA evidence item(s) failed or blocked.`);}
 else if(regressions?.gate==="red"){decision="red";reasons.push("One or more learned regression recipes failed.");}
 else if(missing.length){decision="blocked";reasons.push(`Missing required persisted evidence: ${missing.join(", ")}.`);}
 else if(pendingEvidence.length){decision="provisional";reasons.push(`${pendingEvidence.length} required QA evidence item(s) are still queued/running.`);}
 else if(recipes.length&&!regressions){decision="blocked";reasons.push("Approved regression recipes exist but were not replayed.");}
 else if(regressions?.gate==="provisional"){decision="provisional";reasons.push("Regression replay is waiting for deterministic QA completion.");}
 else if(regressions?.gate==="blocked"){decision="blocked";reasons.push("Regression replay could not obtain a runnable preview/browser target.");}
 else{decision="green";reasons.push("All mandatory persisted evidence is terminal and green.");}
 return{projectId:input.projectId,commitSha:input.commitSha??null,decision,releaseAllowed:decision==="green",reasons,approvedRecipes:recipes.length,orchestrationBlockers:bad.map(r=>({artifactId:r.artifactId,orchestration:r.orchestration})),evidence:{required:{structural:true,browser:requireBrowser,playwrightCi:requireCi,chrome:chromeTriggered},missing,pending:pendingEvidence,failed:failedEvidence,matchingCount:matching.length},regressions,trustedMcpCount:trustedCapabilities().length,policy:releaseGovernorInfo()};
}

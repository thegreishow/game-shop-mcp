import { replayProjectRegressions } from "./qa-replay.js";
import { listQaRecipes } from "./qa-memory.js";
import { trustedCapabilities } from "./capability-trust.js";
import { orchestrationSnapshot } from "./orchestrator.js";

export function releaseGovernorInfo(){return{mode:"evidence-and-memory-gated",decision:["green","provisional","blocked","red"],requirements:["no failed or repair-required orchestration for target project","approved regression memory must be green","no provisional deterministic QA when regressions are required"],nonRequirements:["unapproved QA recipes do not block release","unpromoted MCP candidates do not execute"],policy:"The governor returns a decision; it does not promote a production deployment by itself."};}
export async function evaluateRelease(input:{projectId:string;url?:string;ref?:string;runRegressions?:boolean;queuePlaywrightCi?:boolean}){
 const orchestration=await orchestrationSnapshot();const projectRows=orchestration.rows.filter(r=>r.projectId===input.projectId);const bad=projectRows.filter(r=>{const state=String((r.orchestration as Record<string,unknown>).state??"");return state==="failed"||state==="repair_required";});
 const recipes=await listQaRecipes({projectId:input.projectId,approvedOnly:true});let regressions:Awaited<ReturnType<typeof replayProjectRegressions>>|null=null;
 if((input.runRegressions??true)&&recipes.length)regressions=await replayProjectRegressions({projectId:input.projectId,url:input.url,ref:input.ref,queuePlaywrightCi:input.queuePlaywrightCi??true,autoPreview:true});
 let decision:"green"|"provisional"|"blocked"|"red";const reasons:string[]=[];
 if(bad.length){decision="red";reasons.push(`${bad.length} orchestration item(s) are failed or awaiting repair.`);}else if(recipes.length&&!regressions){decision="blocked";reasons.push("Approved regression recipes exist but were not replayed.");}else if(regressions?.gate==="red"){decision="red";reasons.push("One or more learned regression recipes failed.");}else if(regressions?.gate==="provisional"){decision="provisional";reasons.push("Regression replay is waiting for deterministic QA completion.");}else if(regressions?.gate==="blocked"){decision="blocked";reasons.push("Regression replay could not obtain a runnable preview/browser target.");}else{decision="green";reasons.push(recipes.length?"All approved learned regressions are green.":"No approved learned regressions currently block release.");}
 return{projectId:input.projectId,decision,releaseAllowed:decision==="green",reasons,approvedRecipes:recipes.length,orchestrationBlockers:bad.map(r=>({artifactId:r.artifactId,orchestration:r.orchestration})),regressions,trustedMcpCount:trustedCapabilities().length,policy:releaseGovernorInfo()};
}

import assert from "node:assert/strict";
import { setProjectOverlay, removeProjectOverlay } from "../src/project-overlay.js";
import { createAutonomousJob, judgeAutonomousJob } from "../src/autonomous-job.js";

const projectId="game-shop-control-room-real-proof";
const url=process.env.GAME_SHOP_REAL_PROOF_URL||"https://game-shop-mcp.vercel.app";
function clip(value:unknown,limit=7000){let text:string;try{const encoded=JSON.stringify(value);text=encoded===undefined?String(value??""):encoded;}catch{text=String(value??"");}return text.length>limit?text.slice(0,limit)+"…":text;}

async function main(){
  if(!process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL)throw new Error("GAME_SHOP_PLAYWRIGHT_MCP_URL is required for the real proof.");
  delete process.env.GAME_SHOP_SUPABASE_URL;
  delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
  setProjectOverlay({id:projectId,name:"Game Shop Control Room",repo:"thegreishow/game-shop-mcp",defaultBranch:"main",framework:"website",productKind:"website",projectPath:".",verifyPaths:["index.html","console.js","console.css"]});
  try{
    const job=await createAutonomousJob({goal:"Prove the live Game Shop Control Room works in Chromium using the canonical browser-authoritative execution loop",projectId,autonomy:"plan",constraints:["read-only live proof","no repository mutation","Playwright must be the terminal judge"],maxRepairAttempts:3});
    const judged=await judgeAutonomousJob({
      executionId:job.executionId,url,provider:"playwright-mcp",autoPreview:false,checks:[{path:"index.html",required:false}],
      interactions:["wait:400","click:[data-view='mission']","wait:300"],
      assertions:[
        {kind:"title-includes",includes:"Game Shop"},
        {kind:"selector-visible",selector:"#view-mission"},
        {kind:"selector-text",selector:"#viewTitle",includes:"Mission"},
        {kind:"selector-visible",selector:"#missionForm"},
        {kind:"selector-visible",selector:"#missionBrief"},
        {kind:"selector-visible",selector:"#missionLane"},
        {kind:"body-min-text",min:200},
      ],
    });
    if(!("qa" in judged)||!judged.qa)throw new Error(`Real project browser judgement did not execute: ${JSON.stringify(judged)}`);
    const qa=judged.qa;
    if(judged.status!=="passed"){
      console.error("REAL PROOF FINDINGS",clip(qa.findings));
      console.error("REAL PROOF BROWSER ERRORS",clip(qa.browser?.errors));
      console.error("REAL PROOF CONSOLE",clip(qa.browser?.console));
      console.error("REAL PROOF NETWORK",clip(qa.browser?.network));
      console.error("REAL PROOF ASSERTIONS",clip(qa.browser?.assertions));
      console.error("REAL PROOF STEPS",clip(qa.browser?.steps));
      console.error("REAL PROOF NAVIGATION",clip(qa.browser?.navigation));
      console.error("REAL PROOF SNAPSHOT",clip(qa.browser?.snapshot));
    }
    assert.equal(judged.status,"passed",`Real project browser judgement failed: ${JSON.stringify(qa.findings??[])}`);
    assert.equal(judged.job.outcome?.status,"success");
    assert.equal(qa.browserAuthority.authoritative,true);
    assert.equal(qa.browserAuthority.passed,true);
    assert.equal(qa.browser?.judgement?.passed,true);
    assert.equal((qa.browser?.screenshots.length??0)>0,true);
    console.log(`REAL PROJECT PROOF PASSED: ${url}`);
    console.log(`executionId=${job.executionId} provider=${qa.provider} browserAuthoritative=${qa.browserAuthority.passed} screenshots=${qa.browser?.screenshots.length??0}`);
  }finally{removeProjectOverlay(projectId);}
}
main().catch(error=>{console.error(error);process.exit(1);});

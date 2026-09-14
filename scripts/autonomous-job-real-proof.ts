import assert from "node:assert/strict";
import { setProjectOverlay, removeProjectOverlay } from "../src/project-overlay.js";
import { createAutonomousJob, judgeAutonomousJob } from "../src/autonomous-job.js";

const projectId="dubai-legends-real-proof";
const url=process.env.GAME_SHOP_REAL_PROOF_URL||"https://thegreishow.com/arcade/games/dubai-legends/";
function clip(value:unknown,limit=7000){let text="";try{text=JSON.stringify(value);}catch{text=String(value);}return text.length>limit?text.slice(0,limit)+"…":text;}

async function main(){
  if(!process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL)throw new Error("GAME_SHOP_PLAYWRIGHT_MCP_URL is required for the real proof.");
  delete process.env.GAME_SHOP_SUPABASE_URL;
  delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
  setProjectOverlay({id:projectId,name:"Dubai Legends: Night Cup 2026",repo:"thegreishow/thegreishow.com",defaultBranch:"main",framework:"browser-game",productKind:"browser-game",projectPath:"arcade/games/dubai-legends",gamePath:"arcade/games/dubai-legends",verifyPaths:["arcade/games/dubai-legends"]});
  try{
    const job=await createAutonomousJob({goal:"Prove Dubai Legends works in Chromium using the canonical Game Shop browser-authoritative execution loop",projectId,autonomy:"plan",constraints:["read-only live proof","no repository mutation","Playwright must be the terminal judge"],maxRepairAttempts:3});
    const judged=await judgeAutonomousJob({
      executionId:job.executionId,url,provider:"playwright-mcp",autoPreview:false,checks:[{path:"index.html",required:false}],
      interactions:["wait:1500","click:#start","wait:500"],
      assertions:[
        {kind:"title-includes",includes:"Dubai Legends"},{kind:"selector-visible",selector:"#scoreboard"},{kind:"selector-visible",selector:"#controls"},{kind:"selector-text",selector:"#round",includes:"QUALIFIER"},{kind:"selector-text",selector:"#hit",includes:"HIT"},{kind:"body-min-text",min:80},
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

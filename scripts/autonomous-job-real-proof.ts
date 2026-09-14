import assert from "node:assert/strict";
import { setProjectOverlay, removeProjectOverlay } from "../src/project-overlay.js";
import { createAutonomousJob, judgeAutonomousJob } from "../src/autonomous-job.js";

const projectId="jamaica-run-real-proof";
const url=process.env.GAME_SHOP_REAL_PROOF_URL||"https://thegreishow.com/arcade/games/jamaica-run/";
function clip(value:unknown,limit=7000){let text:string;try{const encoded=JSON.stringify(value);text=encoded===undefined?String(value??""):encoded;}catch{text=String(value??"");}return text.length>limit?text.slice(0,limit)+"…":text;}

async function main(){
  if(!process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL)throw new Error("GAME_SHOP_PLAYWRIGHT_MCP_URL is required for the real proof.");
  delete process.env.GAME_SHOP_SUPABASE_URL;
  delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
  setProjectOverlay({id:projectId,name:"Jamaica Run",repo:"thegreishow/thegreishow.com",defaultBranch:"main",framework:"browser-game",productKind:"browser-game",projectPath:"arcade/games/jamaica-run",gamePath:"arcade/games/jamaica-run",verifyPaths:["arcade/games/jamaica-run"]});
  try{
    const job=await createAutonomousJob({goal:"Prove the public Jamaica Run build works in Chromium using the canonical Game Shop browser-authoritative execution loop",projectId,autonomy:"plan",constraints:["read-only live proof","no repository mutation","Playwright must be the terminal judge"],maxRepairAttempts:3});
    const judged=await judgeAutonomousJob({
      executionId:job.executionId,url,provider:"playwright-mcp",autoPreview:false,checks:[{path:"index.html",required:false}],
      interactions:["wait:500","click:#startBtn","wait:700"],
      assertions:[
        {kind:"title-includes",includes:"Jamaica Run"},
        {kind:"selector-visible",selector:"#game"},
        {kind:"canvas-ready",selector:"#game"},
        {kind:"selector-hidden",selector:"#startScreen"},
        {kind:"selector-visible",selector:"#scoreText"},
        {kind:"selector-text",selector:"#scoreText",includes:"Score:"},
        {kind:"body-min-text",min:30},
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

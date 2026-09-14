import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { redirectAllowed } from "../src/oauth.js";

async function main(){
  const [html,js,missionJs,realExecutionJs,css,missionCss,vercel]=await Promise.all([
    readFile("index.html","utf8"),readFile("console.js","utf8"),readFile("console-mission.js","utf8"),readFile("console-real-execution.js","utf8"),readFile("console.css","utf8"),readFile("console-mission.css","utf8"),readFile("vercel.json","utf8"),
  ]);
  assert.match(html,/Game Shop · Mission Control/);
  assert.match(html,/PROJECT-AWARE MISSION CONTROL/);
  assert.match(html,/Planned → Running → QA → Repair → Ready → Released/);
  assert.match(html,/VISUAL \+ BROWSER EVIDENCE/);
  assert.match(html,/gameshop\.thegreishow\.com/);
  assert.match(html,/console-real-execution\.js/);
  assert.match(js,/method:\"initialize\"/);assert.match(js,/method:\"tools\/list\"/);assert.match(js,/method:\"tools\/call\"/);assert.match(js,/code_challenge_method/);assert.match(js,/gameshop_route_website_workflow/);assert.match(js,/gameshop_route_game_workflow/);
  for(const tool of ["gameshop_mission_projects","gameshop_mission_context","gameshop_plan_mission","gameshop_execute_mission_handoff","gameshop_mission_jobs","gameshop_mission_job","gameshop_record_visual_qa","gameshop_qa_capture_mission","gameshop_qa_repair_and_rerun","gameshop_approve_mission","gameshop_repair_mission","gameshop_release_mission"])assert.match(missionJs,new RegExp(tool),`missing console Mission Control tool: ${tool}`);
  for(const tool of ["gameshop_mission_code_agent_status","gameshop_run_mission"])assert.match(realExecutionJs,new RegExp(tool),`missing real execution console tool: ${tool}`);
  assert.match(realExecutionJs,/Run Mission for Real/);assert.match(realExecutionJs,/gameshop\.execute/);assert.match(realExecutionJs,/gameshop\.write/);assert.match(realExecutionJs,/Open generated PR/);
  assert.match(missionJs,/qaAutoCaptureBtn/);assert.match(missionJs,/qaRerunAfterRepairBtn/);assert.match(missionJs,/Confirm the repair has already been applied/);
  assert.match(missionJs,/beforeUrl/);assert.match(missionJs,/afterUrl/);assert.match(missionJs,/consoleErrors/);assert.match(missionJs,/networkErrors/);assert.match(missionJs,/playwright/);
  assert.match(css,/\.tool-layout/);assert.match(missionCss,/\.job-board/);assert.match(missionCss,/\.qa-visual-grid/);assert.match(missionCss,/@media\(max-width:760px\)/);
  const config=JSON.parse(vercel);assert.ok(config.rewrites.some((x:{source:string;destination:string})=>x.source==="/console"&&x.destination==="/index.html"));
  assert.equal(redirectAllowed("https://game-shop-mcp.vercel.app/console"),true);assert.equal(redirectAllowed("https://gameshop.thegreishow.com/console"),true);assert.equal(redirectAllowed("https://evil.example/console"),false);
  console.log("Game Shop web console smoke OK: Mission Control, real execution controls, automatic visual QA, MCP client, OAuth PKCE and responsive shell verified.");
}
main().catch(error=>{console.error(error);process.exit(1)});
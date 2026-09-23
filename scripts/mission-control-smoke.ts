import assert from "node:assert/strict";
import { routeAppWorkflow } from "../src/app-workflow-router.js";
import { routeMediaWorkflow } from "../src/media-workflow-router.js";
import { dispatchMissionHandoff, listMissionJobs, missionControlContext, missionProjects, prepareMission, recordMissionVisualQa, transitionMission } from "../src/mission-control.js";
import { requiredScopesForTool } from "../src/security.js";
import { invalidateMissionProjectSnapshot, missionProjectSourceSnapshot } from "../src/mission-projects.js";

async function main(){
 delete process.env.GAME_SHOP_SUPABASE_URL;delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;delete process.env.GAME_SHOP_GITHUB_TOKEN;delete process.env.GITHUB_TOKEN;
 const ids=new Set(missionProjects().map(p=>p.projectId));
 for(const id of ["thegreishow-site","cruber","jukebaxx","watadash","watadash-game","game-shop-mcp"])assert.ok(ids.has(id),`missing Mission Control project: ${id}`);
 const app=routeAppWorkflow({brief:"Improve a Jamaica delivery marketplace",kind:"marketplace",phase:"upgrade",existingProject:true});
 assert.equal(app.selectedKind,"marketplace");assert.ok(app.needs.includes("payments"));assert.ok(app.stages.some(s=>/Stripe|commerce/i.test(`${s.owner} ${s.purpose}`)));
 const media=routeMediaWorkflow({brief:"Prepare a release video with captions and social cutdowns",kind:"video",needs:["social-cutdowns"],phase:"release"});
 assert.equal(media.selectedKind,"video");assert.ok(media.stages.some(s=>/Media QA/i.test(s.owner)));assert.ok(media.gates.some(g=>/Paid generation/i.test(g)));
 const planned=await prepareMission({projectId:"cruber",brief:"Audit the worker application flow and prepare the smallest safe repair.",phase:"audit",budgetUsd:0});
 assert.equal(planned.execution.status,"planned");assert.equal(planned.packet.mission.lane,"app");assert.ok(planned.packet.handoffs.length>0);assert.equal(planned.packet.project.project.source.kind,"github");
 const context=await missionControlContext("cruber");assert.equal(context.project.project.projectId,"cruber");assert.equal(context.brief.projectId,"cruber");assert.ok(context.brief.stack);assert.ok(context.brief.freshness);assert.ok(context.recentJobs.some(j=>j?.executionId===planned.execution.executionId));
 const cached=await missionProjectSourceSnapshot("cruber");assert.equal(cached.freshness.cached,true);invalidateMissionProjectSnapshot("cruber");const refreshed=await missionProjectSourceSnapshot("cruber");assert.equal(refreshed.freshness.cached,false);
 const audit=await prepareMission({projectId:"watadash-game",brief:"Read-only browser game controls audit",phase:"audit",budgetUsd:0,permissions:{write:false,execute:false,deploy:false}});
 assert.equal(audit.packet.handoffs.find(h=>h.target==="github")?.requiredScope,"gameshop.read");
 assert.ok(!audit.packet.handoffs.some(h=>h.requiredScope==="gameshop.write"||h.requiredScope==="gameshop.deploy"));
 assert.equal(audit.packet.permissions.execute,false);
 assert.ok((audit.packet.route.stages as Array<{lane:string}>).every(stage=>stage.lane!=="runtime"));
 const release=await prepareMission({projectId:"watadash-game",brief:"Release browser game",phase:"release",budgetUsd:0});
 assert.equal(release.packet.handoffs.filter(h=>h.target==="github").at(-1)?.requiredScope,"gameshop.deploy");
 assert.equal(release.packet.handoffs.find(h=>h.target==="github")?.requiredScope,"gameshop.write");
 const handoff=await dispatchMissionHandoff({executionId:planned.execution.executionId});assert.equal(handoff.executionId,planned.execution.executionId);assert.ok(handoff.handoff.target);
 await transitionMission({executionId:planned.execution.executionId,action:"qa"});
 await recordMissionVisualQa({projectId:"cruber",executionId:planned.execution.executionId,status:"passed",findings:["Smoke evidence"],consoleErrors:[],networkErrors:[],playwright:{status:"passed"}});
 const ready=await transitionMission({executionId:planned.execution.executionId,action:"approve"});assert.ok(ready);const jobs=await listMissionJobs({projectId:"cruber"});assert.equal(jobs[0]?.stage,"ready");
 assert.deepEqual(requiredScopesForTool("gameshop_plan_mission"),["gameshop.plan"]);
 assert.deepEqual(requiredScopesForTool("gameshop_record_visual_qa"),["gameshop.qa"]);
 assert.deepEqual(requiredScopesForTool("gameshop_execute_mission_handoff"),["gameshop.execute"]);
 assert.deepEqual(requiredScopesForTool("gameshop_release_mission"),["gameshop.deploy"]);
 console.log(`Mission Control smoke OK: ${ids.size} projects, durable mission lifecycle, app/media routing, visual QA and scope boundaries verified.`);
}
main().catch(error=>{console.error(error);process.exit(1);});

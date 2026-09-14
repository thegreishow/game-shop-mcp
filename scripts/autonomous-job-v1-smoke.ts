import assert from "node:assert/strict";
import { setProjectOverlay, removeProjectOverlay } from "../src/project-overlay.js";
import {
  autonomousJobInfo,
  autonomyPolicy,
  classifyQaFailure,
  createAutonomousJob,
  autonomousJobStatus,
} from "../src/autonomous-job.js";
import { providerPerformance, recordProviderExecutionFeedback } from "../src/provider-performance.js";

async function main(){
  delete process.env.GAME_SHOP_SUPABASE_URL;
  delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GAME_SHOP_ALLOW_GITHUB_WRITES;
  setProjectOverlay({id:"autonomy-smoke",name:"Autonomy Smoke",repo:"thegreishow/thegreishow.com",defaultBranch:"main",framework:"browser-game",productKind:"browser-game",projectPath:"arcade/games/dubai-legends",gamePath:"arcade/games/dubai-legends"});
  try{
    const info=autonomousJobInfo();
    assert.equal(info.protocol,"canonical-autonomous-job-v1");
    assert.equal(info.shippingRule.includes("never merges"),true);
    const ship=autonomyPolicy("ship");
    assert.equal(ship.mayOpenPullRequest,true);
    assert.equal(ship.mayMergePullRequest,false);
    const observe=autonomyPolicy("observe");
    assert.equal(observe.mayPlan,false);
    assert.equal(observe.mayWriteControlledBranch,false);

    const job=await createAutonomousJob({goal:"Prove the real browser feedback loop",projectId:"autonomy-smoke",autonomy:"repair",constraints:["project scope only","browser pass required"],budgetUsd:0,maxRepairAttempts:99});
    assert.match(job.executionId,/^gs_job_/);
    assert.equal(job.repository,"thegreishow/thegreishow.com");
    assert.equal(job.projectRoot,"arcade/games/dubai-legends");
    assert.equal(job.budget.maxRepairAttempts,5);
    assert.deepEqual(job.artifacts,[]);
    assert.deepEqual(job.evidence,[]);
    assert.deepEqual(job.failures,[]);
    assert.deepEqual(job.repairAttempts,[]);
    const status=await autonomousJobStatus(job.executionId);
    assert.equal(status?.job.executionId,job.executionId);
    assert.equal(status?.job.autonomy,"repair");

    assert.equal(classifyQaFailure([{kind:"console",severity:"error",message:"Uncaught TypeError"}]),"runtime-exception");
    assert.equal(classifyQaFailure([{kind:"network",severity:"error",message:"GET /sprite.png 404"}]),"broken-asset");
    assert.equal(classifyQaFailure([{kind:"visual",severity:"error",message:"selector not visible"}]),"layout-issue");
    assert.equal(classifyQaFailure([{kind:"interaction",severity:"error",message:"button did not respond"}]),"interaction-failure");
    assert.equal(classifyQaFailure([{kind:"deployment",severity:"error",message:"preview failed"}]),"deployment-failure");

    await recordProviderExecutionFeedback({provider:"playwright-mcp",outcome:"success",executionId:job.executionId,projectId:job.projectId,capability:"browser-qa",latencyMs:1200,actualCostUsd:0,retries:1,qaStatus:"passed",artifactAccepted:true});
    const performance=await providerPerformance("playwright-mcp");
    assert.equal(performance.executionSamples>=1,true);
    assert.equal(performance.qaPasses>=1,true);
    assert.equal(performance.acceptedArtifacts>=1,true);
    assert.equal(performance.totalRetries>=1,true);
    assert.equal(performance.totalCostUsd,0);
    console.log(`Autonomous Job v1 smoke OK: ${job.executionId}; autonomy=${job.autonomy}; maxRepairs=${job.budget.maxRepairAttempts}; measuredRouting=${performance.executionSamples} sample(s).`);
  }finally{removeProjectOverlay("autonomy-smoke");}
}
main().catch(error=>{console.error(error);process.exit(1);});

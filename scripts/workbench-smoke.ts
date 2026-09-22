import assert from "node:assert/strict";
import { buildWorkbenchMission } from "../src/workbench.js";
import { registerWorkbenchTools } from "../src/register-workbench-tools.js";
import { integrationReadiness } from "../src/integration-runtime.js";

const originalExternal = process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
const originalVoice = process.env.ELEVENLABS_API_KEY;
try {
  process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS = "true";
  process.env.ELEVENLABS_API_KEY = "test-only-not-a-real-key";
  assert.equal(integrationReadiness("raylight-mcp")[0].authReady, false);
  assert.equal(integrationReadiness("raylight-mcp")[0].callableNow, false);
  assert.equal(integrationReadiness("elevenlabs")[0].callableNow, true);
  const repair = buildWorkbenchMission({ goal: "Fix the right jump input and build the 2D runner scenery." });
  assert.deepEqual(repair.workflow.map((step) => step.lane), ["code", "qa"]);
  for (const step of repair.workflow) {
    assert.ok(![step.primary, ...step.fallbacks].some((candidate) => candidate?.id === "elevenlabs"));
    for (const candidate of [step.primary, ...step.fallbacks]) {
      if (candidate) assert.ok(candidate.matchedCapabilities.length > 0);
    }
  }
  const excluded = buildWorkbenchMission({ goal: "Polish the HUD. No 3D or production release. Add sound effects." });
  assert.ok(!excluded.workflow.some((step) => step.lane === "3d" || step.lane === "release"));
  assert.ok(excluded.workflow.some((step) => step.lane === "audio"));
  const contrasted = buildWorkbenchMission({ goal: "No production release but add music." });
  assert.ok(contrasted.workflow.some((step) => step.lane === "audio"));
  assert.ok(!contrasted.workflow.some((step) => step.lane === "release"));
  const plural = buildWorkbenchMission({ goal: "Add animated sprites and menus with voices." });
  for (const lane of ["motion", "sprite", "ui", "audio"]) assert.ok(plural.workflow.some((step) => step.lane === lane));
  process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS = "false";
  assert.equal(integrationReadiness("elevenlabs")[0].callableNow, false);
  assert.equal(buildWorkbenchMission({ goal: "Add music", lanes: ["audio"] }).executionView.immediateGameShopCalls.length, 0);
  process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS = "true";

  const full = buildWorkbenchMission({ goal: "Improve motion", lanes: ["motion", "motion"], maxCandidatesPerLane: 5 });
  const code = buildWorkbenchMission({ goal: "Implement a repair", lanes: ["code"], maxCandidatesPerLane: 5 });
  assert.ok(![code.workflow[0].primary, ...code.workflow[0].fallbacks].some((candidate) => candidate?.id === "unison-brain"));
  const release = buildWorkbenchMission({ goal: "Publish the project", lanes: ["release"], maxCandidatesPerLane: 5 });
  assert.ok(![release.workflow[0].primary, ...release.workflow[0].fallbacks].some((candidate) => ["fal-ai", "podium"].includes(candidate?.id ?? "")));
  const compact = buildWorkbenchMission({ goal: "Improve motion", lanes: ["motion"], maxCandidatesPerLane: 5, detail: "compact" });
  assert.equal(full.workflow.length, 1);
  assert.deepEqual(compact.executionView, full.executionView);
  assert.equal(compact.workflow[0].primary?.id, full.workflow[0].primary?.id);
  assert.ok(JSON.stringify(compact).length < JSON.stringify(full).length);
  const shader = buildWorkbenchMission({ goal: "Shader runtime", lanes: ["shader"], maxCandidatesPerLane: 5 });
  assert.ok(["library", "platform-api", "installable"].includes(shader.workflow[0].primary?.mode ?? ""));
  for (const step of shader.workflow) {
    if (["library", "platform-api", "installable"].includes(step.primary?.mode ?? "")) {
      assert.match(step.action, /project workspace/);
      assert.doesNotMatch(step.action, /Enable external/);
    }
  }
  let schema: any;
  registerWorkbenchTools({ registerTool: (_name: string, config: any) => { schema = config.inputSchema; } });
  assert.equal(schema.safeParse({ goal: "Fix runner", lanes: ["invalid"] }).success, false);
  assert.equal(schema.safeParse({ goal: "Fix runner", lanes: [] }).success, false);
  assert.equal(schema.safeParse({ goal: "Fix runner", lanes: ["code"], detail: "compact" }).success, true);
  console.log(`workbench regression smoke: ok; compact saves ${JSON.stringify(full).length - JSON.stringify(compact).length} response characters`);
} finally {
  if (originalExternal === undefined) delete process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
  else process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS = originalExternal;
  if (originalVoice === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = originalVoice;
}

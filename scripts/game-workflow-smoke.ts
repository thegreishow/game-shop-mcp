import assert from "node:assert/strict";
import { advanceGameWorkflow, attachEvidence, attachPatchPreview, commitGate, createGameWorkflow, markPlaytested, markValidated } from "../src/game-workflow.js";

const exactSha = "0123456789abcdef0123456789abcdef01234567";
const exactTree = "89abcdef0123456789abcdef0123456789abcdef";

let workflow = createGameWorkflow("dubai-legends");
assert.equal(workflow.stage, "inspect");
assert.ok(workflow.allowedRoots.includes("arcade/games/dubai-legends"));

workflow = advanceGameWorkflow(workflow, "plan");
workflow = advanceGameWorkflow(workflow, "patch");
workflow = attachPatchPreview(workflow, ["arcade/games/dubai-legends/runtime/compat/example.js"], "--- a/example\n+++ b/example\n");

assert.throws(
  () => attachPatchPreview(workflow, ["arcade/games/orbit-breaker/index.html"], "diff"),
  /outside project allowlist/,
);

workflow = advanceGameWorkflow(workflow, "validate");
assert.throws(
  () => markValidated(workflow, { ok: false, label: "validate-site", exactSha, exactTree }),
  /not green/,
);
workflow = markValidated(workflow, { ok: true, label: "validate-site", exactSha, exactTree });
workflow = advanceGameWorkflow(workflow, "playtest");
assert.throws(
  () => markPlaytested(workflow, { ok: true, label: "playwright", exactSha: "different-sha" }),
  /./,
);
workflow = markPlaytested(workflow, { ok: true, label: "playwright", exactSha, exactTree });
workflow = advanceGameWorkflow(workflow, "evidence");
workflow = attachEvidence(workflow, "screenshot", "artifacts/game-shop/dubai-legends/desktop.png");
workflow = advanceGameWorkflow(workflow, "commit");

const gate = commitGate(workflow);
assert.equal(gate.ready, true);
assert.equal(gate.projectId, "dubai-legends");
assert.equal(gate.changedFiles.length, 1);
assert.equal(gate.exactSha, exactSha);
assert.equal(gate.exactTree, exactTree);

let mismatched = createGameWorkflow("dubai-legends");
mismatched = advanceGameWorkflow(mismatched, "plan");
mismatched = advanceGameWorkflow(mismatched, "patch");
mismatched = attachPatchPreview(mismatched, ["arcade/games/dubai-legends/runtime/compat/example.js"], "diff");
mismatched = advanceGameWorkflow(mismatched, "validate");
mismatched = markValidated(mismatched, { ok: true, label: "validate-site", exactSha, exactTree });
mismatched = advanceGameWorkflow(mismatched, "playtest");
mismatched = markPlaytested(mismatched, { ok: true, label: "playwright", exactSha: "fedcba9876543210fedcba9876543210fedcba98", exactTree });
mismatched = advanceGameWorkflow(mismatched, "evidence");
mismatched = attachEvidence(mismatched, "screenshot", "artifact.png");
assert.throws(() => advanceGameWorkflow(mismatched, "commit"), /same exact SHA/);

console.log("Game workflow smoke passed: allowlists, green evidence, artifacts, and exact-revision commit authorization.");

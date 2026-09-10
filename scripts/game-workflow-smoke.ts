import assert from "node:assert/strict";
import { advanceGameWorkflow, attachEvidence, attachPatchPreview, commitGate, createGameWorkflow, markPlaytested, markValidated } from "../src/game-workflow.js";

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
workflow = markValidated(workflow, { ok: true });
workflow = advanceGameWorkflow(workflow, "playtest");
workflow = markPlaytested(workflow, { ok: true });
workflow = advanceGameWorkflow(workflow, "evidence");
workflow = attachEvidence(workflow, "screenshot", "artifacts/game-shop/dubai-legends/desktop.png");
workflow = advanceGameWorkflow(workflow, "commit");

const gate = commitGate(workflow);
assert.equal(gate.ready, true);
assert.equal(gate.projectId, "dubai-legends");
assert.equal(gate.changedFiles.length, 1);

console.log("Game workflow smoke passed.");

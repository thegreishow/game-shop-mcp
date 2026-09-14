import assert from "node:assert/strict";
import { gameWorkflowMatrix, routeGameWorkflow } from "../src/game-workflow-router.js";

const browser = routeGameWorkflow({
  brief: "Improve an existing browser driving game without changing engines.",
  phase: "fix",
  runtime: "auto",
  existingProject: true,
  needs: ["gameplay", "ui", "browser-qa", "performance"],
});
assert.equal(browser.selectedRuntime, "browser");
assert.equal(browser.primaryLane, "game-studio");
assert.ok(browser.specialists.some((target) => target.id === "game-studio"));
assert.ok(browser.specialists.some((target) => target.id === "game-development-studio"));
assert.ok(!browser.specialists.some((target) => target.id === "unity"));
assert.ok(browser.policies.noEngineMigrationByAvailability);

const unity = routeGameWorkflow({
  brief: "Build a networked 3D game with physics and navigation in Unity.",
  phase: "create",
  runtime: "auto",
  needs: ["gameplay", "physics", "ai-navigation", "multiplayer", "build-validation"],
});
assert.equal(unity.selectedRuntime, "unity");
assert.equal(unity.primaryLane, "unity");
assert.ok(unity.gates.some((gate) => gate.startsWith("unity-workspace:")));
assert.ok(unity.stages.some((stage) => stage.lane === "engine-systems" && stage.owner === "unity"));

const cinematic = routeGameWorkflow({
  brief: "Create a branching interactive film game with story choices and QTEs.",
  needs: ["cinematic", "story"],
});
assert.equal(cinematic.selectedRuntime, "cinematic");
assert.equal(cinematic.primaryLane, "yoroll");
assert.ok(cinematic.gates.some((gate) => gate.startsWith("yoroll-generation:")));

const environment = routeGameWorkflow({
  brief: "Add a detailed explorable 3D interior and custom props to a browser game.",
  runtime: "browser",
  needs: ["gameplay", "3d-room", "3d-assets", "visual-debug", "browser-qa"],
});
for (const id of ["build-3d-game-rooms", "game-development-studio", "tripo-3d"] as const) {
  assert.ok(environment.specialists.some((target) => target.id === id), `expected ${id}`);
}
assert.ok(environment.gates.some((gate) => gate.startsWith("room-gates:")));
assert.ok(environment.gates.some((gate) => gate.startsWith("3d-provider-spend:")));

const release = routeGameWorkflow({
  brief: "Validate and release the current browser build.",
  phase: "release",
  runtime: "browser",
  existingProject: true,
  needs: ["browser-qa", "deployment"],
});
assert.ok(release.stages.some((stage) => stage.lane === "release" && stage.owner === "game-shop"));
assert.ok(release.stages.some((stage) => stage.lane === "release" && stage.owner === "github"));

const matrix = gameWorkflowMatrix();
assert.equal(matrix.targets.length, 8);
assert.deepEqual(matrix.release, ["game-shop", "github"]);

console.log("game workflow router smoke: ok");

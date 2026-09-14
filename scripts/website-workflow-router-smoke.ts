import assert from "node:assert/strict";
import { routeWebsiteWorkflow, websiteWorkflowMatrix } from "../src/website-workflow-router.js";

const landing = routeWebsiteWorkflow({
  brief: "Create a premium launch landing page",
  kind: "landing",
  framework: "react",
});
assert.equal(landing.selectedKind, "landing");
assert.ok(landing.needs.includes("seo"));
assert.ok(landing.needs.includes("accessibility"));
assert.ok(!landing.routes.some((route) => route.domain === "commerce"));
assert.ok(!landing.routes.some((route) => route.domain === "3d"));
assert.ok(!landing.routes.some((route) => route.domain === "auth"));
assert.ok(landing.cautions.some((text) => text.includes("static/client-side")));

const ecommerce = routeWebsiteWorkflow({
  brief: "Build a storefront with accounts and checkout",
  kind: "ecommerce",
  framework: "react",
});
assert.equal(ecommerce.selectedKind, "ecommerce");
assert.ok(ecommerce.needs.includes("commerce"));
assert.ok(ecommerce.needs.includes("auth"));
assert.ok(ecommerce.routes.some((route) => route.domain === "commerce" && route.selected === "stripe"));
assert.ok(ecommerce.routes.some((route) => route.domain === "auth"));
assert.ok(ecommerce.gates.some((gate) => gate.startsWith("commerce-intent-and-auth")));

const experiential = routeWebsiteWorkflow({
  brief: "Build an immersive 3D campaign website",
  kind: "experiential",
  framework: "react",
});
assert.equal(experiential.selectedKind, "experiential");
assert.ok(experiential.routes.some((route) => route.domain === "3d"));
assert.ok(experiential.routes.some((route) => route.domain === "shader"));
assert.ok(experiential.gates.some((gate) => gate.startsWith("web-3d-performance-and-fallback")));

const repair = routeWebsiteWorkflow({
  brief: "Fix a broken existing artist site without redesigning it",
  phase: "fix",
  kind: "artist",
  existingProject: true,
  needs: ["ui", "performance", "browser-qa"],
});
assert.ok(repair.stages.some((stage) => stage.lane === "inspection"));
assert.ok(repair.cautions.some((text) => text.includes("smallest evidence-backed repair")));
assert.ok(!repair.routes.some((route) => route.domain === "commerce"));
assert.ok(!repair.routes.some((route) => route.domain === "3d"));

const matrix = websiteWorkflowMatrix();
assert.ok(matrix.kinds.includes("artist"));
assert.ok(matrix.kinds.includes("web-app"));
assert.ok(matrix.kinds.includes("ecommerce"));
assert.ok(matrix.kinds.includes("experiential"));

console.log("website workflow router smoke ok");

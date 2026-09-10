import assert from "node:assert/strict";
import { resolveIntegrationOperation } from "../src/integration-policy.js";
import { requiredScopesForTool } from "../src/security.js";

function mustThrow(fn:()=>unknown, pattern:RegExp){
  assert.throws(fn, pattern);
}

// Generic integration runtime is deny-by-default.
mustThrow(()=>resolveIntegrationOperation({integrationId:"replicate",mode:"api",method:"DELETE",path:"v1/predictions/abc"}),/not allowlisted/i);
mustThrow(()=>resolveIntegrationOperation({integrationId:"replicate",mode:"api",method:"POST",path:"v1/models/delete-all"}),/not allowlisted/i);
mustThrow(()=>resolveIntegrationOperation({integrationId:"meshy",mode:"api",method:"POST",path:"v2/text-to-3d"}),/not allowlisted/i);
mustThrow(()=>resolveIntegrationOperation({integrationId:"unknown-provider",mode:"api",method:"GET",path:"status"}),/not allowlisted/i);
mustThrow(()=>resolveIntegrationOperation({integrationId:"replicate",mode:"mcp-call",tool:"predictions.create"}),/not allowlisted/i);

const read = resolveIntegrationOperation({integrationId:"replicate",mode:"api",method:"GET",path:"v1/predictions/pred_123"});
assert.equal(read.mutation,"read");
assert.equal(read.billing,"free");

const paid = resolveIntegrationOperation({integrationId:"replicate",mode:"api",method:"POST",path:"v1/predictions"});
assert.equal(paid.mutation,"write");
assert.equal(paid.billing,"paid");

const listTools = resolveIntegrationOperation({integrationId:"fal-ai",mode:"mcp-list-tools",method:"GET"});
assert.equal(listTools.mutation,"read");

// Scope classifier must keep privilege boundaries separated.
assert.deepEqual(requiredScopesForTool("gameshop_list_projects"),["gameshop.read"]);
assert.deepEqual(requiredScopesForTool("gameshop_plan_build"),["gameshop.plan"]);
assert.deepEqual(requiredScopesForTool("gameshop_qa_evidence"),["gameshop.qa"]);
assert.deepEqual(requiredScopesForTool("gameshop_invoke_integration"),["gameshop.execute"]);
assert.deepEqual(requiredScopesForTool("gameshop_github_upsert"),["gameshop.write"]);
assert.deepEqual(requiredScopesForTool("gameshop_create_preview_deployment"),["gameshop.deploy"]);

console.log("Game Shop adversarial security checks OK: deny-by-default integration policy and scope boundaries verified.");

import { providerHealthSummary, rankHealthyProviders } from "../src/provider-health-v2.js";
import { providerAdapterRegistry } from "../src/provider-adapters-v2.js";
import { sdkHubStatus } from "../src/sdk-hub.js";

const summary = providerHealthSummary();
const sdk = sdkHubStatus();
const adapters = providerAdapterRegistry();

console.log("== Game Shop provider health smoke ==");
console.log(`providers=${summary.total}`);
console.log(`readyOrConfigured=${summary.readyOrConfigured}`);
console.log(`deferred=${summary.deferred}`);
console.log(`vendorBlocked=${summary.vendorBlocked}`);
console.log(`localRuntime=${summary.localRuntime}`);
console.log(`authNeeded=${summary.authNeeded}`);
console.log(`sdkProviders=${sdk.length}`);
console.log(`phase2Adapters=${adapters.length}`);

for (const provider of sdk) {
  console.log(
    `${provider.id}: configured=${provider.configured} package=${provider.packageName}@${provider.version} capabilities=${provider.capabilities.join(",")}`,
  );
}

if (sdk.length !== 6) throw new Error(`Expected 6 SDK Hub providers, got ${sdk.length}`);
if (adapters.length !== 5) throw new Error(`Expected 5 Phase 2 media adapters, got ${adapters.length}`);
if (!sdk.find((row) => row.id === "podium" && row.packageName === "@podium-sdk/node-sdk")) {
  throw new Error("Expected Podium SDK metadata in provider health smoke.");
}
if (!summary.rows.find((row) => row.id === "kibo-ui" && row.state === "vendor-blocked")) {
  throw new Error("Expected Kibo vendor blocker to remain represented in versioned health data.");
}

const configured=summary.rows.find(row=>row.configured&&row.capabilities.length);if(configured){const ranked=rankHealthyProviders(configured.capabilities[0],[configured.id],{[configured.id]:{reachable:true,tested:true,latencyMs:100,estimatedCostUsd:0}});if(ranked.length!==1||ranked[0].routeEvidence.tested!==true)throw new Error("Evidence-aware routing did not preserve a verified compatible provider.");}
const unavailable=rankHealthyProviders("component-docs",["kibo-ui"],{"kibo-ui":{reachable:false,tested:false}});if(unavailable.length)throw new Error("Unreachable provider must not be routed solely because it is registered.");
console.log("PASS — evidence-aware routing verified; no provider request was made.");

import { routeSdkCapability, sdkHubStatus } from "../src/sdk-hub.js";
import { providerAdapterRegistry } from "../src/provider-adapters-v2.js";
import { realOrchestrationPlan } from "../src/real-orchestration.js";

const status = sdkHubStatus();
if (status.length !== 6) throw new Error(`Expected 6 SDK providers, found ${status.length}.`);

const ids = new Set(status.map((row) => row.id));
for (const required of ["replicate", "fal", "elevenlabs", "scenario", "cloudinary", "podium"]) {
  if (!ids.has(required as never)) throw new Error(`Missing SDK provider: ${required}`);
}

for (const row of status) {
  if (!row.packageName || !row.version || !row.install || !row.apiBase || !row.authScheme) {
    throw new Error(`Incomplete portable SDK metadata for ${row.id}.`);
  }
}

const adapters = providerAdapterRegistry();
if (adapters.length !== 5) throw new Error(`Expected 5 Phase 2 media adapters, found ${adapters.length}.`);

const delivery = routeSdkCapability("media-delivery", { requireConfigured: false });
if (delivery !== "cloudinary") throw new Error(`Expected Cloudinary for media delivery, got ${delivery}.`);

const speech = routeSdkCapability("speech-generation", { requireConfigured: false });
if (speech !== "elevenlabs") throw new Error(`Expected ElevenLabs for speech, got ${speech}.`);

const commerce = routeSdkCapability("commerce-search", { requireConfigured: false });
if (commerce !== "podium") throw new Error(`Expected Podium for commerce search, got ${commerce}.`);

const checkout = routeSdkCapability("agentic-checkout", { requireConfigured: false });
if (checkout !== "podium") throw new Error(`Expected Podium for agentic checkout, got ${checkout}.`);

const plan = await realOrchestrationPlan({
  capability: "image-generation",
  execute: false,
  payloads: {
    fal: { model: "example/model", input: { prompt: "smoke-test-only" } },
    replicate: { version: "example-version", input: { prompt: "smoke-test-only" } }
  }
});
if (plan.fallbackPolicy !== "adaptive-route-before-submit-only") throw new Error("Unexpected fallback policy.");
if (!plan.learning || plan.learning.mode !== "adaptive-health-routing") throw new Error("Adaptive learning metadata missing.");

console.log("SDK Hub Phase 3 routing smoke: OK");
console.log(`providers=${status.length}`);
console.log(`adapters=${adapters.length}`);
console.log(`externalExecutionAllowed=${plan.externalExecutionAllowed}`);
console.log("paid provider requests executed=0");

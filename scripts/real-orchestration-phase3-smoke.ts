import { providerPerformance, recordProviderPerformance } from "../src/provider-performance.js";
import { realOrchestrationPlan, realOrchestrationInfo } from "../src/real-orchestration.js";

const provider = "fal";
for (let i = 0; i < 3; i += 1) {
  await recordProviderPerformance({
    provider,
    phase: "submit",
    outcome: "failure",
    latencyMs: 1200 + i * 100,
    capability: "image-generation",
    operation: "submit",
    data: { smoke: true },
  });
}

const learned = await providerPerformance(provider);
if (learned.consecutiveFailures < 3) throw new Error("Expected three consecutive failures in learned telemetry.");
if (learned.circuit.state !== "open") throw new Error(`Expected open circuit, got ${learned.circuit.state}.`);
if (learned.scoreAdjustment > -90) throw new Error(`Expected severe routing penalty, got ${learned.scoreAdjustment}.`);

const plan = await realOrchestrationPlan({
  capability: "image-generation",
  execute: false,
  payloads: {
    fal: { model: "example/model", input: { prompt: "no provider call" } },
    replicate: { version: "example-version", input: { prompt: "no provider call" } },
  },
});
const fal = plan.candidates.find((candidate) => candidate.provider === "fal");
if (!fal) throw new Error("fal candidate missing.");
if (!fal.circuitOpen) throw new Error("Adaptive router did not surface the open circuit.");
if (fal.eligible) throw new Error("Provider with an open circuit must not be eligible.");

const info = realOrchestrationInfo();
if (info.version !== 3) throw new Error(`Expected orchestration v3, got ${info.version}.`);
if (!info.autonomousPipeline?.stages.includes("browser-qa")) throw new Error("Autonomous pipeline contract is incomplete.");

console.log("Real Orchestration Phase 3 smoke: OK");
console.log(`circuit=${learned.circuit.state}`);
console.log(`scoreAdjustment=${learned.scoreAdjustment}`);
console.log("paid provider requests executed=0");

import { listEvents, logEvent } from "./governance-ledger.js";

export type ProviderPerformancePhase = "submit" | "poll" | "pipeline" | "execution";
export type ProviderPerformanceOutcome = "success" | "failure" | "repair_required" | "blocked";

export type ProviderPerformanceSnapshot = {
  provider: string;
  samples: number;
  requestSamples: number;
  executionSamples: number;
  successes: number;
  failures: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  consecutiveFailures: number;
  pipelineSuccesses: number;
  pipelineFailures: number;
  totalCostUsd: number;
  avgCostUsd: number | null;
  totalRetries: number;
  avgRetries: number | null;
  qaPasses: number;
  qaFailures: number;
  qaPassRate: number | null;
  acceptedArtifacts: number;
  rejectedArtifacts: number;
  artifactAcceptanceRate: number | null;
  lastEventAt: string | null;
  circuit: {
    state: "closed" | "half-open" | "open";
    reason: string | null;
    retryAfter: string | null;
  };
  scoreAdjustment: number;
};

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function eventData(event:Record<string,unknown>){return event.data&&typeof event.data==="object"?event.data as Record<string,unknown>:{};}
function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index] ?? null;
}
function rate(pass:number,fail:number){return pass+fail?pass/(pass+fail):null;}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export async function recordProviderPerformance(input: {
  provider: string;
  phase: ProviderPerformancePhase;
  outcome: ProviderPerformanceOutcome;
  latencyMs?: number;
  executionId?: string;
  projectId?: string;
  capability?: string;
  operation?: string;
  data?: Record<string, unknown>;
}) {
  return logEvent({
    type: `provider.${input.phase}.${input.outcome}`,
    executionId: input.executionId,
    projectId: input.projectId,
    provider: input.provider,
    latencyMs: input.latencyMs,
    data: { capability: input.capability ?? null, operation: input.operation ?? null, ...(input.data ?? {}) },
  });
}

export async function recordProviderExecutionFeedback(input:{
  provider:string;
  outcome:"success"|"failure"|"blocked";
  executionId?:string;
  projectId?:string;
  capability?:string;
  operation?:string;
  latencyMs?:number;
  actualCostUsd?:number;
  retries?:number;
  qaStatus?:string;
  artifactAccepted?:boolean;
  data?:Record<string,unknown>;
}){
  return recordProviderPerformance({
    provider:input.provider,
    phase:"execution",
    outcome:input.outcome,
    executionId:input.executionId,
    projectId:input.projectId,
    capability:input.capability,
    operation:input.operation,
    latencyMs:input.latencyMs,
    data:{
      actualCostUsd:Math.max(0,input.actualCostUsd??0),
      retries:Math.max(0,Math.floor(input.retries??0)),
      qaStatus:input.qaStatus??null,
      artifactAccepted:input.artifactAccepted??null,
      ...(input.data??{}),
    },
  });
}

export async function providerPerformance(provider: string): Promise<ProviderPerformanceSnapshot> {
  const events = (await listEvents({ provider, limit: 100 })) as Array<Record<string, unknown>>;
  const relevant = events.filter((event) => String(event.type ?? "").startsWith("provider."));
  const requestEvents = relevant.filter((event) => {
    const type = String(event.type ?? "");
    return type.startsWith("provider.submit.") || type.startsWith("provider.poll.");
  });
  const executionEvents=relevant.filter(event=>String(event.type??"").startsWith("provider.execution."));
  const successes = requestEvents.filter((event) => String(event.type).endsWith(".success")).length;
  const failures = requestEvents.filter((event) => String(event.type).endsWith(".failure")).length;
  const latencies = requestEvents.concat(executionEvents).map((event) => numberValue(event.latency_ms)).filter((value): value is number => value !== null);
  const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  const pipelineSuccesses = relevant.filter((event) => String(event.type) === "provider.pipeline.success").length;
  const pipelineFailures = relevant.filter((event) => ["provider.pipeline.failure", "provider.pipeline.repair_required"].includes(String(event.type))).length;
  const costs=executionEvents.map(e=>numberValue(eventData(e).actualCostUsd)).filter((v):v is number=>v!==null);
  const retries=executionEvents.map(e=>numberValue(eventData(e).retries)).filter((v):v is number=>v!==null);
  const totalCostUsd=Number(costs.reduce((a,b)=>a+b,0).toFixed(6));
  const avgCostUsd=costs.length?Number((totalCostUsd/costs.length).toFixed(6)):null;
  const totalRetries=retries.reduce((a,b)=>a+b,0);
  const avgRetries=retries.length?Number((totalRetries/retries.length).toFixed(2)):null;
  const qaPasses=executionEvents.filter(e=>String(eventData(e).qaStatus??"")==="passed").length;
  const qaFailures=executionEvents.filter(e=>["failed","blocked"].includes(String(eventData(e).qaStatus??""))).length;
  const qaPassRate=rate(qaPasses,qaFailures);
  const acceptedArtifacts=executionEvents.filter(e=>eventData(e).artifactAccepted===true).length;
  const rejectedArtifacts=executionEvents.filter(e=>eventData(e).artifactAccepted===false).length;
  const artifactAcceptanceRate=rate(acceptedArtifacts,rejectedArtifacts);

  let consecutiveFailures = 0;
  for (const event of requestEvents) {
    if (String(event.type).endsWith(".failure")) consecutiveFailures += 1;
    else if (String(event.type).endsWith(".success")) break;
  }

  const newestRequest = requestEvents[0];
  const newestAt = newestRequest?.created_at ? new Date(String(newestRequest.created_at)).getTime() : 0;
  const ageMs = newestAt ? Date.now() - newestAt : Number.POSITIVE_INFINITY;
  let circuit: ProviderPerformanceSnapshot["circuit"] = { state: "closed", reason: null, retryAfter: null };
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD && ageMs < CIRCUIT_COOLDOWN_MS) {
    circuit = { state: "open", reason: `${consecutiveFailures} consecutive provider request failures`, retryAfter: new Date(newestAt + CIRCUIT_COOLDOWN_MS).toISOString() };
  } else if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit = { state: "half-open", reason: "Circuit cooldown elapsed; allow a single probe before restoring normal traffic.", retryAfter: null };
  }

  const total = successes + failures;
  const successRate = total ? successes / total : null;
  let scoreAdjustment = 0;
  if (successRate !== null) {
    if (successRate >= 0.95) scoreAdjustment += 15;
    else if (successRate >= 0.8) scoreAdjustment += 8;
    else if (successRate < 0.4) scoreAdjustment -= 35;
    else if (successRate < 0.6) scoreAdjustment -= 20;
  }
  if (avgLatencyMs !== null) {
    if (avgLatencyMs <= 3000) scoreAdjustment += 8;
    else if (avgLatencyMs <= 10000) scoreAdjustment += 4;
    else if (avgLatencyMs > 60000) scoreAdjustment -= 12;
    else if (avgLatencyMs > 30000) scoreAdjustment -= 6;
  }
  scoreAdjustment -= Math.min(30, consecutiveFailures * 8);
  if (pipelineSuccesses + pipelineFailures >= 2) {
    const pipelineRate = pipelineSuccesses / (pipelineSuccesses + pipelineFailures);
    scoreAdjustment += pipelineRate >= 0.8 ? 8 : pipelineRate < 0.5 ? -12 : 0;
  }
  if(qaPassRate!==null)scoreAdjustment+=qaPassRate>=0.8?6:qaPassRate<0.5?-10:0;
  if(artifactAcceptanceRate!==null)scoreAdjustment+=artifactAcceptanceRate>=0.8?5:artifactAcceptanceRate<0.5?-8:0;
  if(avgRetries!==null)scoreAdjustment-=Math.min(10,Math.round(avgRetries*2));
  if (circuit.state === "open") scoreAdjustment = -100;
  else if (circuit.state === "half-open") scoreAdjustment = Math.min(scoreAdjustment, -20);

  return {
    provider,
    samples: relevant.length,
    requestSamples: requestEvents.length,
    executionSamples:executionEvents.length,
    successes,
    failures,
    successRate,
    avgLatencyMs,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    consecutiveFailures,
    pipelineSuccesses,
    pipelineFailures,
    totalCostUsd,
    avgCostUsd,
    totalRetries,
    avgRetries,
    qaPasses,
    qaFailures,
    qaPassRate,
    acceptedArtifacts,
    rejectedArtifacts,
    artifactAcceptanceRate,
    lastEventAt: relevant[0]?.created_at ? String(relevant[0].created_at) : null,
    circuit,
    scoreAdjustment: clamp(scoreAdjustment, -100, 25),
  };
}

export async function providerPerformanceSnapshot(providers: string[]) { return Promise.all(providers.map((provider) => providerPerformance(provider))); }

export function providerLearningInfo() {
  return {
    mode: "adaptive-health-routing",
    inputs: ["success-rate", "latency", "consecutive-failures", "pipeline-QA-outcomes", "end-to-end-QA", "artifact-acceptance", "retries", "observed-cost", "recency"],
    circuitBreaker: { consecutiveFailures: CIRCUIT_FAILURE_THRESHOLD, cooldownMs: CIRCUIT_COOLDOWN_MS, states: ["closed", "half-open", "open"] },
    persistence: "game_shop_events when Supabase is configured; process-memory fallback otherwise",
    spendSafety: "routing learns only from observed results; cost and QA feedback never bypass external-execution, write, or paid-generation gates",
  } as const;
}

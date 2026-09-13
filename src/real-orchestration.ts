import { createArtifact, type ArtifactKind, type ArtifactPurpose } from "./artifacts.js";
import { orchestrateArtifact } from "./orchestrator.js";
import { PHASE2_ADAPTERS, pollProviderTask, submitProviderTask, type Phase2ProviderId, type ProviderTaskResult } from "./provider-adapters-v2.js";
import { providerHealthSnapshot } from "./provider-health-v2.js";
import { providerLearningInfo, providerPerformanceSnapshot, recordProviderPerformance } from "./provider-performance.js";
import { spendPolicy } from "./spend.js";

export type RealOrchestrationCapability =
  | "model-inference"
  | "image-generation"
  | "video-generation"
  | "audio-generation"
  | "speech-generation"
  | "3d-generation"
  | "upscaling"
  | "asset-upload"
  | "asset-management";

export type RealOrchestrationRequest = {
  capability: RealOrchestrationCapability;
  preferredProvider?: Phase2ProviderId;
  payloads: Partial<Record<Phase2ProviderId, Record<string, unknown>>>;
  execute?: boolean;
  executionId?: string;
  projectId?: string;
  purpose?: ArtifactPurpose;
  kind?: ArtifactKind;
  name?: string;
  targetPath?: string;
};

export type AutonomousPipelineRequest = RealOrchestrationRequest & {
  execute: true;
  maxPolls?: number;
  pollIntervalMs?: number;
};

const INTEGRATION_ID: Record<Phase2ProviderId, string> = {
  fal: "fal-ai",
  replicate: "replicate",
  elevenlabs: "elevenlabs",
  scenario: "scenario",
  cloudinary: "cloudinary",
};

const BASE_PRIORITY: Record<RealOrchestrationCapability, readonly Phase2ProviderId[]> = {
  "model-inference": ["fal", "replicate"],
  "image-generation": ["fal", "scenario", "replicate", "elevenlabs"],
  "video-generation": ["fal", "scenario", "replicate", "elevenlabs"],
  "audio-generation": ["elevenlabs", "fal", "scenario", "replicate"],
  "speech-generation": ["elevenlabs"],
  "3d-generation": ["scenario", "fal", "replicate"],
  upscaling: ["replicate", "fal", "scenario"],
  "asset-upload": ["cloudinary"],
  "asset-management": ["cloudinary", "scenario"],
};

const DEFAULT_OPERATION: Record<Phase2ProviderId, string> = {
  fal: "submit",
  replicate: "predict",
  elevenlabs: "speech",
  scenario: "generate",
  cloudinary: "upload",
};

const POLL_OPERATION: Partial<Record<Phase2ProviderId, string>> = {
  fal: "job",
  replicate: "prediction",
  elevenlabs: "speech-job",
};

function externalExecutionAllowed() {
  return process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true";
}

function capabilitySupported(provider: Phase2ProviderId, capability: RealOrchestrationCapability) {
  return PHASE2_ADAPTERS[provider].capabilities.includes(capability);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function providerResponse(result: ProviderTaskResult) {
  const root = record(result.raw);
  return record(root.result ?? result.raw);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function realOrchestrationPlan(request: RealOrchestrationRequest) {
  const health = new Map(providerHealthSnapshot().map((row) => [row.id, row]));
  const priority = [...BASE_PRIORITY[request.capability]].filter((provider) => capabilitySupported(provider, request.capability));
  if (request.preferredProvider && priority.includes(request.preferredProvider)) {
    priority.splice(priority.indexOf(request.preferredProvider), 1);
    priority.unshift(request.preferredProvider);
  }

  const performance = new Map((await providerPerformanceSnapshot(priority)).map((row) => [row.provider, row]));
  const candidates = priority
    .map((provider, index) => {
      const row = health.get(INTEGRATION_ID[provider]);
      const learned = performance.get(provider);
      const hasPayload = Boolean(request.payloads[provider]);
      const configured = row?.configured ?? false;
      const adapterReady = row?.adapterReady ?? true;
      const blocked = row?.state === "vendor-blocked" || row?.state === "local-runtime" || row?.state === "research";
      const circuitOpen = learned?.circuit.state === "open";
      const staticScore = row?.score ?? 40;
      const learnedAdjustment = learned?.scoreAdjustment ?? 0;
      const routeScore = Math.max(
        0,
        staticScore + learnedAdjustment + (priority.length - index) * 3 + (request.preferredProvider === provider ? 8 : 0),
      );
      return {
        provider,
        integrationId: INTEGRATION_ID[provider],
        operation: DEFAULT_OPERATION[provider],
        hasPayload,
        configured,
        adapterReady,
        state: row?.state ?? "unknown",
        blocker: row?.blocker ?? null,
        staticHealthScore: staticScore,
        learnedPerformance: learned ?? null,
        learnedAdjustment,
        circuitOpen,
        score: routeScore,
        eligible: hasPayload && configured && adapterReady && !blocked && !circuitOpen,
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);

  return {
    capability: request.capability,
    executeRequested: request.execute === true,
    externalExecutionAllowed: externalExecutionAllowed(),
    externalExecutionGate: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true",
    spend: spendPolicy(),
    learning: providerLearningInfo(),
    selected: candidates.find((candidate) => candidate.eligible) ?? null,
    candidates,
    fallbackPolicy: "adaptive-route-before-submit-only",
    fallbackReason:
      "Game Shop learns from real latency, success/failure and QA outcomes and may choose another provider before submission. It never automatically resubmits an ambiguous paid generation to another provider after submission.",
  };
}

function artifactContext(request: RealOrchestrationRequest) {
  if (!request.executionId) return undefined;
  return {
    executionId: request.executionId,
    projectId: request.projectId,
    purpose: request.purpose ?? "general",
    kind: request.kind,
    name: request.name,
    targetPath: request.targetPath,
  };
}

export async function orchestrateProviderCapability(request: RealOrchestrationRequest) {
  const plan = await realOrchestrationPlan(request);
  if (!request.execute) return { mode: "plan" as const, plan };
  if (!externalExecutionAllowed()) {
    return {
      mode: "blocked" as const,
      plan,
      error: "External provider execution is disabled. Set GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true to permit live SDK/API calls.",
    };
  }
  if (!plan.selected) {
    return {
      mode: "blocked" as const,
      plan,
      error: "No configured, healthy adapter with a provider-specific payload is currently eligible.",
    };
  }

  const provider = plan.selected.provider;
  const payload = request.payloads[provider];
  if (!payload) throw new Error(`No payload supplied for selected provider ${provider}.`);
  const started = Date.now();

  try {
    const result = await submitProviderTask({
      provider,
      operation: plan.selected.operation,
      payload,
      artifact: artifactContext(request),
    });
    await recordProviderPerformance({
      provider,
      phase: "submit",
      outcome: "success",
      latencyMs: Date.now() - started,
      executionId: request.executionId,
      projectId: request.projectId,
      capability: request.capability,
      operation: plan.selected.operation,
      data: { status: result.normalized.status },
    }).catch(() => undefined);

    let registeredArtifact = record(result.raw).artifact ?? null;
    let artifactOrchestration = null;
    if (provider === "cloudinary" && request.executionId && result.normalized.assets[0]) {
      const asset = result.normalized.assets[0];
      registeredArtifact = await createArtifact({
        executionId: request.executionId,
        projectId: request.projectId,
        kind: request.kind ?? asset.kind,
        purpose: request.purpose ?? "general",
        status: "ready",
        name: request.name ?? "Cloudinary asset",
        provider: "cloudinary",
        mimeType: asset.mimeType,
        sourceUrl: asset.url,
        metadata: {
          normalized: result.normalized,
          orchestration: request.targetPath ? { targetPath: request.targetPath, state: "waiting" } : undefined,
        },
      });
      if (request.targetPath) artifactOrchestration = await orchestrateArtifact({ artifactId: registeredArtifact.artifactId });
    }

    return {
      mode: "executed" as const,
      plan,
      selectedProvider: provider,
      result,
      registeredArtifact,
      artifactOrchestration,
      automaticFallbackAttempted: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordProviderPerformance({
      provider,
      phase: "submit",
      outcome: "failure",
      latencyMs: Date.now() - started,
      executionId: request.executionId,
      projectId: request.projectId,
      capability: request.capability,
      operation: plan.selected.operation,
      data: { error: message },
    }).catch(() => undefined);
    return {
      mode: "failed" as const,
      plan,
      selectedProvider: provider,
      error: message,
      automaticFallbackAttempted: false,
      alternatives: plan.candidates.filter((candidate) => candidate.eligible && candidate.provider !== provider),
      note: "No automatic post-submit fallback was attempted. Choose an alternative explicitly after checking whether the first provider created a job.",
    };
  }
}

function pollPayload(provider: Phase2ProviderId, result: ProviderTaskResult): Record<string, unknown> | null {
  const id = result.normalized.providerJobId;
  if (!id) return null;
  const response = providerResponse(result);
  if (provider === "fal") {
    const statusUrl = response.status_url ?? response.statusUrl;
    const responseUrl = response.response_url ?? response.responseUrl;
    if (typeof statusUrl !== "string") return null;
    return { jobId: id, statusUrl, ...(typeof responseUrl === "string" ? { responseUrl } : {}) };
  }
  if (provider === "replicate" || provider === "elevenlabs") return { id };
  return null;
}

export async function continueProviderTask(input: {
  provider: "fal" | "replicate" | "elevenlabs";
  operation: string;
  payload: Record<string, unknown>;
  executionId?: string;
  projectId?: string;
  capability?: string;
}) {
  if (!externalExecutionAllowed()) {
    throw new Error("External provider execution is disabled. Set GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true to poll live provider jobs.");
  }
  const started = Date.now();
  try {
    const result = await pollProviderTask(input);
    await recordProviderPerformance({
      provider: input.provider,
      phase: "poll",
      outcome: "success",
      latencyMs: Date.now() - started,
      executionId: input.executionId,
      projectId: input.projectId,
      capability: input.capability,
      operation: input.operation,
      data: { status: result.normalized.status },
    }).catch(() => undefined);
    return result;
  } catch (error) {
    await recordProviderPerformance({
      provider: input.provider,
      phase: "poll",
      outcome: "failure",
      latencyMs: Date.now() - started,
      executionId: input.executionId,
      projectId: input.projectId,
      capability: input.capability,
      operation: input.operation,
      data: { error: error instanceof Error ? error.message : String(error) },
    }).catch(() => undefined);
    throw error;
  }
}

export async function runAutonomousProviderPipeline(request: AutonomousPipelineRequest) {
  const execution = await orchestrateProviderCapability(request);
  if (execution.mode !== "executed") return { ...execution, autonomy: { continued: false, reason: execution.mode } };

  const provider = execution.selectedProvider;
  const initial = execution.result;
  if (initial.normalized.status === "ready") {
    return { ...execution, mode: "completed" as const, autonomy: { continued: false, terminal: "ready", polls: 0 } };
  }
  if (initial.normalized.status === "failed") {
    return { ...execution, mode: "failed" as const, autonomy: { continued: false, terminal: "failed", polls: 0 } };
  }

  const operation = POLL_OPERATION[provider];
  const payload = pollPayload(provider, initial);
  if (!operation || !payload || !["fal", "replicate", "elevenlabs"].includes(provider)) {
    return {
      ...execution,
      mode: "waiting" as const,
      autonomy: {
        continued: false,
        terminal: null,
        polls: 0,
        reason: "Provider requires scheduled reconciliation or does not expose a bounded poll adapter.",
      },
    };
  }

  const maxPolls = Math.max(1, Math.min(5, request.maxPolls ?? 3));
  const intervalMs = Math.max(250, Math.min(5000, request.pollIntervalMs ?? 1000));
  const history: Array<Record<string, unknown>> = [];
  let latest: ProviderTaskResult = initial;
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    if (attempt > 1 || intervalMs > 0) await wait(intervalMs);
    latest = await continueProviderTask({
      provider: provider as "fal" | "replicate" | "elevenlabs",
      operation,
      payload,
      executionId: request.executionId,
      projectId: request.projectId,
      capability: request.capability,
    });
    history.push({ attempt, status: latest.normalized.status, assets: latest.normalized.assets.length });
    if (latest.normalized.status === "ready" || latest.normalized.status === "failed") break;
  }

  return {
    ...execution,
    mode: latest.normalized.status === "ready" ? ("completed" as const) : latest.normalized.status === "failed" ? ("failed" as const) : ("waiting" as const),
    terminalResult: latest,
    autonomy: {
      continued: true,
      polls: history.length,
      history,
      terminal: latest.normalized.status === "ready" || latest.normalized.status === "failed" ? latest.normalized.status : null,
      scheduledContinuation: latest.normalized.status !== "ready" && latest.normalized.status !== "failed",
    },
  };
}

export function realOrchestrationInfo() {
  return {
    version: 3,
    capabilities: Object.keys(BASE_PRIORITY),
    priority: BASE_PRIORITY,
    adapters: Object.values(PHASE2_ADAPTERS),
    learning: providerLearningInfo(),
    autonomousPipeline: {
      stages: ["adaptive-route", "provider-submit", "bounded-poll", "artifact-finalize", "persist", "project-place", "verify", "preview", "browser-qa", "safe-retry-or-repair-gate"],
      immediatePollsMax: 5,
      scheduledContinuation: "provider reconciler worker continues non-terminal jobs",
      repairPolicy: "transient preview/QA retries may be automatic; code mutation remains write-gated and evidence-driven",
    },
    safety: {
      externalExecutionAllowed: externalExecutionAllowed(),
      externalExecutionGate: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true",
      paidGeneration: spendPolicy(),
      fallback: "adaptive pre-submit routing only; no automatic duplicate generation after uncertain provider errors",
      secrets: "environment-only; never returned by orchestration APIs",
    },
  };
}

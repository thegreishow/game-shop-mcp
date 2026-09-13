import { createArtifact, type ArtifactKind, type ArtifactPurpose } from "./artifacts.js";
import { orchestrateArtifact } from "./orchestrator.js";
import { PHASE2_ADAPTERS, pollProviderTask, submitProviderTask, type Phase2ProviderId } from "./provider-adapters-v2.js";
import { providerHealthSnapshot } from "./provider-health-v2.js";
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

function externalExecutionAllowed() {
  return process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true";
}

function capabilitySupported(provider: Phase2ProviderId, capability: RealOrchestrationCapability) {
  return PHASE2_ADAPTERS[provider].capabilities.includes(capability);
}

export function realOrchestrationPlan(request: RealOrchestrationRequest) {
  const health = new Map(providerHealthSnapshot().map((row) => [row.id, row]));
  const priority = [...BASE_PRIORITY[request.capability]].filter((provider) => capabilitySupported(provider, request.capability));
  if (request.preferredProvider && priority.includes(request.preferredProvider)) {
    priority.splice(priority.indexOf(request.preferredProvider), 1);
    priority.unshift(request.preferredProvider);
  }

  const candidates = priority
    .map((provider, index) => {
      const row = health.get(INTEGRATION_ID[provider]);
      const hasPayload = Boolean(request.payloads[provider]);
      const configured = row?.configured ?? false;
      const adapterReady = row?.adapterReady ?? true;
      const blocked = row?.state === "vendor-blocked" || row?.state === "local-runtime" || row?.state === "research";
      const routeScore = Math.max(0, (row?.score ?? 40) + (priority.length - index) * 3 + (request.preferredProvider === provider ? 8 : 0));
      return {
        provider,
        integrationId: INTEGRATION_ID[provider],
        operation: DEFAULT_OPERATION[provider],
        hasPayload,
        configured,
        adapterReady,
        state: row?.state ?? "unknown",
        blocker: row?.blocker ?? null,
        score: routeScore,
        eligible: hasPayload && configured && adapterReady && !blocked,
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);

  return {
    capability: request.capability,
    executeRequested: request.execute === true,
    externalExecutionAllowed: externalExecutionAllowed(),
    externalExecutionGate: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true",
    spend: spendPolicy(),
    selected: candidates.find((candidate) => candidate.eligible) ?? null,
    candidates,
    fallbackPolicy: "route-before-submit-only",
    fallbackReason:
      "Game Shop may select an alternate provider before a billable submit. It will not automatically resubmit to another provider after an ambiguous generation failure because that could double-spend.",
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
  const plan = realOrchestrationPlan(request);
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

  try {
    const result = await submitProviderTask({
      provider,
      operation: plan.selected.operation,
      payload,
      artifact: artifactContext(request),
    });

    let registeredArtifact = null;
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

export async function continueProviderTask(input: {
  provider: "fal" | "replicate" | "elevenlabs";
  operation: string;
  payload: Record<string, unknown>;
}) {
  if (!externalExecutionAllowed()) {
    throw new Error("External provider execution is disabled. Set GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true to poll live provider jobs.");
  }
  return pollProviderTask(input);
}

export function realOrchestrationInfo() {
  return {
    version: 2,
    capabilities: Object.keys(BASE_PRIORITY),
    priority: BASE_PRIORITY,
    adapters: Object.values(PHASE2_ADAPTERS),
    safety: {
      externalExecutionAllowed: externalExecutionAllowed(),
      externalExecutionGate: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true",
      paidGeneration: spendPolicy(),
      fallback: "pre-submit routing only; no automatic duplicate generation after uncertain provider errors",
      secrets: "environment-only; never returned by orchestration APIs",
    },
  };
}

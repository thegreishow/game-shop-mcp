import {
  elevenSpeech,
  elevenSpeechJob,
  falJob,
  falSubmit,
  replicatePredict,
  replicatePrediction,
  scenarioGenerate,
} from "./external-engines.js";
import { executeSdkRead } from "./sdk-hub.js";
import { normalizeProviderOutput, type NormalizedProviderOutput } from "./normalized-output.js";
import type { ArtifactKind, ArtifactPurpose } from "./artifacts.js";

export type Phase2ProviderId = "fal" | "replicate" | "elevenlabs" | "scenario" | "cloudinary";

export type ProviderArtifactContext = {
  executionId?: string;
  projectId?: string;
  purpose?: ArtifactPurpose;
  kind?: ArtifactKind;
  name?: string;
  targetPath?: string;
};

export type ProviderTaskRequest = {
  provider: Phase2ProviderId;
  operation: string;
  payload: Record<string, unknown>;
  artifact?: ProviderArtifactContext;
};

export type ProviderTaskResult = {
  provider: Phase2ProviderId;
  operation: string;
  normalized: NormalizedProviderOutput;
  raw: unknown;
};

export type ProviderAdapterDefinition = {
  id: Phase2ProviderId;
  mode: "sdk" | "rest-behind-adapter" | "sdk+rest";
  generation: boolean;
  capabilities: readonly string[];
  operations: readonly string[];
  pollOperations: readonly string[];
  fallbackSafeBeforeSubmitOnly: boolean;
  notes: string;
};

export const PHASE2_ADAPTERS: Record<Phase2ProviderId, ProviderAdapterDefinition> = {
  fal: {
    id: "fal",
    mode: "sdk+rest",
    generation: true,
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    operations: ["submit"],
    pollOperations: ["job"],
    fallbackSafeBeforeSubmitOnly: true,
    notes: "Generation submits through the established queue REST contract behind a unified adapter; SDK remains available for richer direct use.",
  },
  replicate: {
    id: "replicate",
    mode: "sdk+rest",
    generation: true,
    capabilities: ["model-inference", "image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling"],
    operations: ["predict"],
    pollOperations: ["prediction"],
    fallbackSafeBeforeSubmitOnly: true,
    notes: "Async prediction REST path is preserved behind the adapter while the official SDK is installed. Auth remains deferred until verified.",
  },
  elevenlabs: {
    id: "elevenlabs",
    mode: "sdk+rest",
    generation: true,
    capabilities: ["speech-generation", "audio-generation", "sound-effects", "music"],
    operations: ["speech"],
    pollOperations: ["speech-job"],
    fallbackSafeBeforeSubmitOnly: true,
    notes: "Speech flow uses the existing async provider contract; official SDK is installed for future direct expansion.",
  },
  scenario: {
    id: "scenario",
    mode: "sdk+rest",
    generation: true,
    capabilities: ["image-generation", "video-generation", "audio-generation", "3d-generation", "upscaling", "asset-management"],
    operations: ["generate"],
    pollOperations: [],
    fallbackSafeBeforeSubmitOnly: true,
    notes: "Scenario SDK is installed; adapter keeps the verified universal REST generation path until API credentials are enabled.",
  },
  cloudinary: {
    id: "cloudinary",
    mode: "sdk",
    generation: false,
    capabilities: ["asset-upload", "asset-management", "image-transform", "video-transform", "media-delivery"],
    operations: ["upload"],
    pollOperations: [],
    fallbackSafeBeforeSubmitOnly: true,
    notes: "Official Cloudinary Node SDK handles artifact upload and delivery. Upload is a mutation but is not a model-generation action.",
  },
};

function stringField(payload: Record<string, unknown>, name: string, required = true): string | undefined {
  const value = payload[name];
  if (value == null && !required) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string.`);
  return value;
}

function objectField(payload: Record<string, unknown>, name: string): Record<string, unknown> {
  const value = payload[name];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  return value as Record<string, unknown>;
}

function artifactFrom(request: ProviderTaskRequest): ProviderArtifactContext | undefined {
  return request.artifact;
}

async function submitFal(request: ProviderTaskRequest) {
  const model = stringField(request.payload, "model")!;
  const input = objectField(request.payload, "input");
  return falSubmit({ model, input, artifact: artifactFrom(request) });
}

async function submitReplicate(request: ProviderTaskRequest) {
  const version = stringField(request.payload, "version")!;
  const input = objectField(request.payload, "input");
  return replicatePredict({ version, input, artifact: artifactFrom(request) });
}

async function submitElevenLabs(request: ProviderTaskRequest) {
  const text = stringField(request.payload, "text")!;
  const voice = stringField(request.payload, "voice")!;
  const modelId = stringField(request.payload, "modelId", false);
  return elevenSpeech({ text, voice, modelId, artifact: artifactFrom(request) });
}

async function submitScenario(request: ProviderTaskRequest) {
  const modelId = stringField(request.payload, "modelId")!;
  const body = objectField(request.payload, "body");
  return scenarioGenerate({ modelId, body, artifact: artifactFrom(request) });
}

async function uploadCloudinary(request: ProviderTaskRequest) {
  const source = stringField(request.payload, "source")!;
  const folder = stringField(request.payload, "folder", false);
  const publicId = stringField(request.payload, "publicId", false);
  return executeSdkRead("cloudinary", async (client) => {
    const cloudinary = client as {
      uploader?: { upload?: (source: string, options?: Record<string, unknown>) => Promise<unknown> };
    };
    if (!cloudinary.uploader?.upload) throw new Error("Cloudinary uploader is unavailable in the loaded SDK.");
    return cloudinary.uploader.upload(source, {
      ...(folder ? { folder } : {}),
      ...(publicId ? { public_id: publicId } : {}),
      resource_type: "auto",
    });
  });
}

export function providerAdapterRegistry() {
  return Object.values(PHASE2_ADAPTERS);
}

export async function submitProviderTask(request: ProviderTaskRequest): Promise<ProviderTaskResult> {
  const adapter = PHASE2_ADAPTERS[request.provider];
  if (!adapter) throw new Error(`Unsupported provider adapter: ${request.provider}`);
  let raw: unknown;
  if (request.provider === "fal" && request.operation === "submit") raw = await submitFal(request);
  else if (request.provider === "replicate" && request.operation === "predict") raw = await submitReplicate(request);
  else if (request.provider === "elevenlabs" && request.operation === "speech") raw = await submitElevenLabs(request);
  else if (request.provider === "scenario" && request.operation === "generate") raw = await submitScenario(request);
  else if (request.provider === "cloudinary" && request.operation === "upload") raw = await uploadCloudinary(request);
  else throw new Error(`Operation ${request.operation} is not implemented for ${request.provider}.`);
  return {
    provider: request.provider,
    operation: request.operation,
    normalized: normalizeProviderOutput(request.provider, raw),
    raw,
  };
}

export async function pollProviderTask(input: {
  provider: Exclude<Phase2ProviderId, "cloudinary" | "scenario">;
  operation: string;
  payload: Record<string, unknown>;
}): Promise<ProviderTaskResult> {
  let raw: unknown;
  if (input.provider === "fal" && input.operation === "job") {
    raw = await falJob({
      jobId: stringField(input.payload, "jobId")!,
      statusUrl: stringField(input.payload, "statusUrl")!,
      responseUrl: stringField(input.payload, "responseUrl", false),
    });
  } else if (input.provider === "replicate" && input.operation === "prediction") {
    raw = await replicatePrediction(stringField(input.payload, "id")!);
  } else if (input.provider === "elevenlabs" && input.operation === "speech-job") {
    raw = await elevenSpeechJob(stringField(input.payload, "id")!);
  } else {
    throw new Error(`Poll operation ${input.operation} is not implemented for ${input.provider}.`);
  }
  return {
    provider: input.provider,
    operation: input.operation,
    normalized: normalizeProviderOutput(input.provider, raw),
    raw,
  };
}

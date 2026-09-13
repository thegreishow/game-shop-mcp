import { z } from "zod";
import { publicErrorMessage } from "./errors.js";
import { providerAdapterRegistry } from "./provider-adapters-v2.js";
import { providerHealthSummary } from "./provider-health-v2.js";
import {
  continueProviderTask,
  orchestrateProviderCapability,
  realOrchestrationInfo,
  realOrchestrationPlan,
} from "./real-orchestration.js";
import { sdkHubStatus } from "./sdk-hub.js";

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === "object" && data !== null ? (data as Record<string, unknown>) : { value: data },
  };
}

function fail(error: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: publicErrorMessage(error) }] };
}

function safe(fn: (input: any) => unknown | Promise<unknown>) {
  return async (input: any) => {
    try {
      return result(await fn(input));
    } catch (error) {
      return fail(error);
    }
  };
}

const provider = z.enum(["fal", "replicate", "elevenlabs", "scenario", "cloudinary"]);
const capability = z.enum([
  "model-inference",
  "image-generation",
  "video-generation",
  "audio-generation",
  "speech-generation",
  "3d-generation",
  "upscaling",
  "asset-upload",
  "asset-management",
]);
const payloads = z.object({
  fal: z.record(z.string(), z.unknown()).optional(),
  replicate: z.record(z.string(), z.unknown()).optional(),
  elevenlabs: z.record(z.string(), z.unknown()).optional(),
  scenario: z.record(z.string(), z.unknown()).optional(),
  cloudinary: z.record(z.string(), z.unknown()).optional(),
});
const artifactPurpose = z.enum([
  "game",
  "website",
  "web-app",
  "mobile-app",
  "desktop-app",
  "api-service",
  "agent",
  "automation",
  "interactive-experience",
  "digital-product",
  "media-project",
  "media",
  "commerce",
  "general",
  "other",
]);
const artifactKind = z.enum([
  "image",
  "sprite",
  "spritesheet",
  "3d",
  "video",
  "audio",
  "rive",
  "document",
  "code",
  "archive",
  "data",
  "other",
]);
const routeInput = z.object({
  capability,
  preferredProvider: provider.optional(),
  payloads,
  executionId: z.string().min(8).max(100).optional(),
  projectId: z.string().max(100).optional(),
  purpose: artifactPurpose.optional(),
  kind: artifactKind.optional(),
  name: z.string().max(300).optional(),
  targetPath: z.string().max(500).optional(),
});

export function registerSdkTools(server: any) {
  server.registerTool(
    "gameshop_sdk_hub_status",
    {
      title: "SDK Hub Status",
      description: "Inspect installed/configured SDK providers, package metadata and capabilities without calling providers.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    safe(async () => ({ providers: sdkHubStatus(), adapters: providerAdapterRegistry() })),
  );

  server.registerTool(
    "gameshop_provider_health",
    {
      title: "Provider Health",
      description: "Rank provider readiness from versioned capability, auth, blocker and adapter metadata. This is local/read-only health, not a paid request.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    safe(async () => providerHealthSummary()),
  );

  server.registerTool(
    "gameshop_real_orchestration_info",
    {
      title: "Real Orchestration Info",
      description: "Describe the Phase 2 provider routing, fallback and spend-safety contract.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    safe(async () => realOrchestrationInfo()),
  );

  server.registerTool(
    "gameshop_plan_provider_task",
    {
      title: "Plan Provider Task",
      description: "Select and rank real SDK/API adapters for a capability without invoking any provider.",
      inputSchema: routeInput,
      annotations: { readOnlyHint: true },
    },
    safe(async (input: any) => realOrchestrationPlan({ ...input, execute: false })),
  );

  server.registerTool(
    "gameshop_run_provider_task",
    {
      title: "Run Provider Task",
      description:
        "Route and invoke one real provider adapter. Paid generation remains blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true. Automatic post-submit fallback is intentionally disabled to prevent duplicate spend.",
      inputSchema: routeInput.extend({ execute: z.literal(true) }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    safe(async (input: any) => orchestrateProviderCapability(input)),
  );

  server.registerTool(
    "gameshop_continue_provider_task",
    {
      title: "Continue Provider Task",
      description: "Poll or finalize a previously submitted fal, Replicate or ElevenLabs provider job.",
      inputSchema: z.object({
        provider: z.enum(["fal", "replicate", "elevenlabs"]),
        operation: z.string().min(1).max(80),
        payload: z.record(z.string(), z.unknown()),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    safe(continueProviderTask),
  );
}

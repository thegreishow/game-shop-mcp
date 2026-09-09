import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { capabilityCatalog } from "../src/catalog.js";
import {
  autoSpriteCreateCharacter,
  autoSpriteGenerateAnimations,
  autoSpriteGetJob,
  autoSpriteGetSpritesheet,
  providerStatus,
  spriteCookGenerate,
  spriteCookGetJob,
  spriteCookListModels,
} from "../src/providers.js";
import { spendPolicy } from "../src/spend.js";

function asResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === "object" && data !== null ? data as Record<string, unknown> : { value: data },
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    "gameshop_list_providers",
    {
      title: "List Game Shop Providers",
      description: "List the AI/game-asset providers configured behind the Game Shop MCP gateway. Never returns API keys. Includes the current spend lock.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => asResult({ spend: spendPolicy(), providers: providerStatus() }),
  );

  server.registerTool(
    "gameshop_spend_policy",
    {
      title: "Game Shop Spend Policy",
      description: "Show whether paid provider generation is allowed. Default is blocked so this gateway cannot spend money.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => asResult(spendPolicy()),
  );

  server.registerTool(
    "gameshop_capability_catalog",
    {
      title: "Game Shop Capability Catalog",
      description: "List build capabilities available to Game Shop agents, including React Bits, Anime.js, game-art providers and model gateways.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => asResult(capabilityCatalog()),
  );

  server.registerTool(
    "gameshop_generate_character",
    {
      title: "Generate Game Character",
      description: "Create a new game character using AutoSprite. Blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true because this consumes provider credits.",
      inputSchema: z.object({
        name: z.string().min(1).max(100),
        prompt: z.string().min(1).max(600),
        quality: z.enum(["turbo", "pro"]).optional(),
        isHumanoid: z.boolean().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        return asResult(await autoSpriteCreateCharacter(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_generate_animation",
    {
      title: "Generate Character Animation",
      description: "Generate sprite-sheet animations for an existing AutoSprite character. Blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true because this consumes provider credits.",
      inputSchema: z.object({
        characterId: z.string().min(1),
        animations: z.array(z.object({
          kind: z.string().min(1),
          name: z.string().optional(),
          prompt: z.string().max(600).optional(),
        })).min(1).max(10),
        videoTier: z.enum(["turbo", "pro", "ultra", "max"]).optional(),
        frameCount: z.number().int().min(2).max(64).optional(),
        frameSize: z.number().int().min(32).max(512).optional(),
        removeBg: z.enum(["default", "ultra"]).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        return asResult(await autoSpriteGenerateAnimations(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_generation_status",
    {
      title: "Check Generation Status",
      description: "Check an AutoSprite generation job without starting a new paid generation.",
      inputSchema: z.object({ jobId: z.string().min(1) }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ jobId }) => {
      try {
        return asResult(await autoSpriteGetJob(jobId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_get_spritesheet",
    {
      title: "Get Sprite Sheet",
      description: "Return AutoSprite sprite-sheet metadata and temporary download URLs for assets that already exist. Does not create a new paid job.",
      inputSchema: z.object({ spritesheetId: z.string().min(1) }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ spritesheetId }) => {
      try {
        return asResult(await autoSpriteGetSpritesheet(spritesheetId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_spritecook_models",
    {
      title: "List SpriteCook Models",
      description: "List the currently available SpriteCook generation models without creating an asset or spending credits.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        return asResult(await spriteCookListModels());
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_spritecook_generate",
    {
      title: "Generate Game Art with SpriteCook",
      description: "Start a SpriteCook game-art generation job. Blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true because this consumes provider credits.",
      inputSchema: z.object({
        prompt: z.string().min(1).max(2000),
        mode: z.enum(["assets", "texture", "ui"]).optional(),
        model: z.string().min(1).optional(),
        resolution: z.enum(["1K", "2K", "4K"]).optional(),
        quality: z.enum(["low", "medium", "high"]).optional(),
        colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(64).optional(),
        referenceAssetId: z.string().optional(),
        editAssetId: z.string().optional(),
        projectId: z.string().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        return asResult(await spriteCookGenerate(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "gameshop_spritecook_status",
    {
      title: "Check SpriteCook Job",
      description: "Check a SpriteCook generation job without starting another paid generation.",
      inputSchema: z.object({ jobId: z.string().min(1) }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ jobId }) => {
      try {
        return asResult(await spriteCookGetJob(jobId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
});

function isAuthorized(request: Request) {
  const token = process.env.GAME_SHOP_MCP_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

async function route(request: Request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return handler(request);
}

export { route as GET, route as POST, route as DELETE };

import { z } from "zod";
import { gameWorkflowMatrix, routeGameWorkflow } from "./game-workflow-router.js";
import { publicErrorMessage } from "./errors.js";

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: typeof data === "object" && data !== null ? (data as Record<string, unknown>) : { value: data },
  };
}

function fail(error: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: publicErrorMessage(error) }] };
}

const phase = z.enum(["create", "upgrade", "fix", "audit", "release"]);
const runtime = z.enum(["auto", "browser", "unity", "cinematic", "hybrid"]);
const preference = z.enum(["quality", "speed", "cost", "balanced"]);
const need = z.enum([
  "gameplay",
  "ui",
  "2d-assets",
  "3d-assets",
  "3d-room",
  "cinematic",
  "story",
  "physics",
  "ai-navigation",
  "multiplayer",
  "visual-debug",
  "performance",
  "browser-qa",
  "build-validation",
  "deployment",
]);

export function registerGameWorkflowTools(server: any) {
  server.registerTool(
    "gameshop_route_game_workflow",
    {
      title: "Route Game Production Workflow",
      description:
        "Choose the correct Game Shop production lane across browser Game Studio, Unity Workbench, Game Development Studio, 3D room production, Yoroll and delegated 3D generation. Read-only: routing does not authorize writes, external execution or spend.",
      inputSchema: z.object({
        brief: z.string().min(3).max(4000),
        phase: phase.optional(),
        runtime: runtime.optional(),
        needs: z.array(need).max(15).optional(),
        preference: preference.optional(),
        existingProject: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (input: unknown) => {
      try {
        return result(routeGameWorkflow(input as Parameters<typeof routeGameWorkflow>[0]));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "gameshop_game_workflow_matrix",
    {
      title: "Game Production Routing Matrix",
      description:
        "Inspect Game Shop's specialist game-production lanes, execution surfaces, requirements, asset routing, diagnostics and release path.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => result(gameWorkflowMatrix()),
  );
}

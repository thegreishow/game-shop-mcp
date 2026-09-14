import { z } from "zod";
import { publicErrorMessage } from "./errors.js";
import { routeWebsiteWorkflow, websiteWorkflowMatrix } from "./website-workflow-router.js";

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
const kind = z.enum(["auto", "landing", "marketing", "artist", "portfolio", "content", "ecommerce", "web-app", "experiential"]);
const framework = z.enum(["react", "vanilla", "vue", "any"]);
const preference = z.enum(["quality", "speed", "cost", "bundle", "open-source", "balanced"]);
const need = z.enum([
  "ui",
  "motion",
  "seo",
  "accessibility",
  "performance",
  "forms",
  "media",
  "cms",
  "auth",
  "data",
  "backend",
  "commerce",
  "3d",
  "shader",
  "video",
  "analytics",
  "observability",
  "browser-qa",
  "deployment",
]);

export function registerWebsiteWorkflowTools(server: any) {
  server.registerTool(
    "gameshop_route_website_workflow",
    {
      title: "Route Website Production Workflow",
      description:
        "Classify and route website creation, repair, audit and release work across UI, motion, SEO, accessibility, backend/data/auth, commerce, media, 3D, browser QA and deployment. Read-only: routing does not authorize writes, external execution, paid generation or production release.",
      inputSchema: z.object({
        brief: z.string().min(3).max(4000),
        phase: phase.optional(),
        kind: kind.optional(),
        framework: framework.optional(),
        needs: z.array(need).max(19).optional(),
        preference: preference.optional(),
        existingProject: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (input: unknown) => {
      try {
        return result(routeWebsiteWorkflow(input as Parameters<typeof routeWebsiteWorkflow>[0]));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "gameshop_website_workflow_matrix",
    {
      title: "Website Production Routing Matrix",
      description:
        "Inspect Game Shop's website types, default needs, specialist routing rules, QA expectations and release boundaries.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => result(websiteWorkflowMatrix()),
  );
}

import { integrationRegistry, type Integration } from "./integrations.js";
import { integrationReadiness } from "./integration-runtime.js";
import { getMissionProject } from "./mission-projects.js";

export type WorkbenchPreference = "quality" | "speed" | "cost" | "balanced";

type LaneId = "code" | "ui" | "motion" | "sprite" | "audio" | "3d" | "shader" | "qa" | "release" | "memory";

type Lane = {
  id: LaneId;
  reason: string;
  domains: string[];
  capabilityTerms: string[];
};

const laneCatalog: Record<LaneId, Omit<Lane, "reason">> = {
  code: { id: "code", domains: ["website", "web-app", "mobile-app", "game", "agent-platform"], capabilityTerms: ["project-init", "install", "code", "component-install", "project-memory"] },
  ui: { id: "ui", domains: ["ui", "website", "web-app", "mobile-app", "game"], capabilityTerms: ["component", "layout", "templates", "ui", "hud", "menu"] },
  motion: { id: "motion", domains: ["motion", "ui", "game"], capabilityTerms: ["motion", "animation", "transition", "scroll", "gesture", "timeline"] },
  sprite: { id: "sprite", domains: ["game", "ui"], capabilityTerms: ["sprite", "spritesheet", "character", "pixel-art", "background-removal"] },
  audio: { id: "audio", domains: ["audio", "game", "video"], capabilityTerms: ["speech", "sound-effects", "music", "voice", "audio"] },
  "3d": { id: "3d", domains: ["3d", "game", "ui"], capabilityTerms: ["3d", "scene", "rigging", "texturing", "glb"] },
  shader: { id: "shader", domains: ["shader", "3d", "ui", "motion"], capabilityTerms: ["shader", "webgl", "gradient"] },
  qa: { id: "qa", domains: ["testing", "observability", "agent-platform"], capabilityTerms: ["audit", "doctor", "verification", "visual-review", "browser"] },
  release: { id: "release", domains: ["deployment", "agent-platform"], capabilityTerms: ["deploy", "preview", "release", "webhooks"] },
  memory: { id: "memory", domains: ["project-memory", "code-search", "media-search", "agent-platform"], capabilityTerms: ["memory", "search", "context", "recall", "index"] },
};

function text(input: Integration) {
  return `${input.id} ${input.name} ${input.domains.join(" ")} ${input.capabilities.join(" ")} ${input.notes}`.toLowerCase();
}

function inferLanes(goal: string): Lane[] {
  const g = goal.toLowerCase();
  const ids = new Set<LaneId>(["code", "qa"]);
  const add = (id: LaneId, match: RegExp) => { if (match.test(g)) ids.add(id); };
  add("ui", /ui|interface|menu|hud|screen|page|card|layout|premium|visual|website|app/);
  add("motion", /motion|animation|animate|transition|smooth|camera|cinematic|movement|feel|juice/);
  add("sprite", /sprite|character|player|batsman|bowler|fielder|pixel|avatar|enemy|npc/);
  add("audio", /audio|sound|music|voice|commentary|sfx|soundtrack/);
  add("3d", /3d|model|mesh|stadium|scene|environment|glb|rig/);
  add("shader", /shader|webgl|glow|lighting|gradient|fx|vfx/);
  add("memory", /context|remember|memory|search files|codebase|documents/);
  add("release", /ship|deploy|release|publish|live|production|preview/);

  return [...ids].map((id) => ({ ...laneCatalog[id], reason: `Selected from goal signals for ${id}.` }));
}

function scoreIntegration(integration: Integration, lane: Lane, readiness: any, preference: WorkbenchPreference) {
  const hay = text(integration);
  let score = 0;
  for (const domain of lane.domains) if (integration.domains.includes(domain)) score += 5;
  for (const term of lane.capabilityTerms) if (hay.includes(term)) score += 4;
  if (integration.kinds.includes("mcp") || integration.kinds.includes("desktop-mcp")) score += 3;
  if (readiness?.callableNow) score += 8;
  else if (readiness?.authReady && readiness?.remotelyCallable) score += 5;
  else if (integration.state === "ready") score += 4;
  else if (integration.state === "installable") score += 2;
  if (readiness?.mode === "stdio-mcp" || readiness?.mode === "desktop-mcp") score += 1;

  if (preference === "cost") {
    if (integration.state === "ready" || integration.state === "installable") score += 2;
    if (["fal-ai", "replicate", "meshy", "elevenlabs", "ludo-ai", "motion-so", "scenario"].includes(integration.id)) score -= 2;
  }
  if (preference === "speed" && readiness?.callableNow) score += 3;
  if (preference === "quality" && ["motion-ai-kit", "elevenlabs", "meshy", "fal-ai", "replicate", "scenario", "raylight-mcp"].includes(integration.id)) score += 2;
  return score;
}

function summarizeProject(project: ReturnType<typeof getMissionProject>) {
  const github = project.source.kind === "github" ? project.source : null;
  return {
    id: project.projectId,
    name: project.name,
    repo: github?.repo ?? null,
    framework: project.framework ?? null,
    productKind: project.productKind,
    root: github?.root ?? null,
    sourceKind: project.source.kind,
    deployment: project.deployment ?? null,
  };
}

export function buildWorkbenchMission(input: {
  goal: string;
  projectId?: string;
  preference?: WorkbenchPreference;
  maxCandidatesPerLane?: number;
}) {
  const preference = input.preference ?? "quality";
  const maxCandidates = Math.max(1, Math.min(input.maxCandidatesPerLane ?? 3, 5));
  const registry = integrationRegistry();
  const readinessRows = integrationReadiness() as any[];
  const readinessById = new Map(readinessRows.map((row) => [row.id, row]));
  const lanes = inferLanes(input.goal);
  const project = input.projectId ? getMissionProject(input.projectId) : null;

  const workflow = lanes.map((lane, index) => {
    const ranked = registry
      .map((integration) => ({ integration, readiness: readinessById.get(integration.id), score: scoreIntegration(integration, lane, readinessById.get(integration.id), preference) }))
      .filter((row) => row.score > 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)
      .map((row) => ({
        id: row.integration.id,
        name: row.integration.name,
        score: row.score,
        kinds: row.integration.kinds,
        state: row.integration.state,
        mode: row.readiness?.mode ?? null,
        callableNow: Boolean(row.readiness?.callableNow),
        authReady: Boolean(row.readiness?.authReady),
        install: row.integration.install ?? null,
        endpoint: row.integration.endpoint ?? null,
        note: row.readiness?.note ?? row.integration.notes,
      }));

    const primary = ranked[0] ?? null;
    return {
      order: index + 1,
      lane: lane.id,
      reason: lane.reason,
      primary,
      fallbacks: ranked.slice(1),
      action: primary
        ? primary.callableNow
          ? `Use ${primary.name} now through Game Shop.`
          : primary.mode === "stdio-mcp" || primary.mode === "desktop-mcp"
            ? `Use ${primary.name} from the local Codex workstation; Game Shop should coordinate the task and consume the resulting artifact.`
            : primary.authReady
              ? `Enable external integrations, then use ${primary.name}.`
              : `Prepare/authenticate ${primary.name}, otherwise use the first ready fallback.`
        : "No verified integration ranked strongly enough; keep this lane manual or run capability discovery.",
    };
  });

  const blockers = workflow
    .filter((step) => !step.primary || (!step.primary.callableNow && !step.fallbacks.some((f: any) => f.callableNow)))
    .map((step) => ({ lane: step.lane, reason: step.primary ? step.action : "No verified candidate." }));

  const immediate = workflow.filter((step) => step.primary?.callableNow).map((step) => ({ lane: step.lane, integration: step.primary!.id }));
  const local = workflow.filter((step) => step.primary && (step.primary.mode === "stdio-mcp" || step.primary.mode === "desktop-mcp")).map((step) => ({ lane: step.lane, integration: step.primary!.id }));

  return {
    version: "1.1",
    role: "project-aware mission router",
    project: project ? summarizeProject(project) : null,
    goal: input.goal,
    preference,
    workflow,
    executionView: {
      immediateGameShopCalls: immediate,
      localCodexMcpLanes: local,
      blockers,
      nextRecommendedTool: project ? "gameshop_plan_mission" : "gameshop_plan_build",
      afterImplementation: ["gameshop_run_qa_swarm", "gameshop_evaluate_release"],
    },
    principle: "Game Shop chooses and sequences engines; it should not force one provider to do work another provider is better at.",
  };
}

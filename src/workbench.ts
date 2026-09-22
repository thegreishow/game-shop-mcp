import { integrationRegistry, type Integration } from "./integrations.js";
import { integrationReadiness } from "./integration-runtime.js";
import { getMissionProject } from "./mission-projects.js";

export type WorkbenchPreference = "quality" | "speed" | "cost" | "balanced";

export type LaneId = "code" | "ui" | "motion" | "sprite" | "audio" | "3d" | "shader" | "qa" | "release" | "memory";

type Lane = {
  id: LaneId;
  reason: string;
  domains: string[];
  capabilityTerms: string[];
};

const laneCatalog: Record<LaneId, Omit<Lane, "reason">> = {
  code: { id: "code", domains: ["website", "web-app", "mobile-app", "game", "agent-platform"], capabilityTerms: ["project-init", "code", "component-install", "source-edit", "file-edit"] },
  ui: { id: "ui", domains: ["ui", "website", "web-app", "mobile-app", "game"], capabilityTerms: ["component", "layout", "templates", "ui", "hud", "menu"] },
  motion: { id: "motion", domains: ["motion", "ui", "game"], capabilityTerms: ["motion", "animation", "transition", "scroll", "gesture", "timeline"] },
  sprite: { id: "sprite", domains: ["game", "ui"], capabilityTerms: ["sprite", "spritesheet", "character", "pixel-art", "background-removal"] },
  audio: { id: "audio", domains: ["audio", "game", "video"], capabilityTerms: ["speech", "sound-effects", "music", "voice", "audio"] },
  "3d": { id: "3d", domains: ["3d", "game", "ui"], capabilityTerms: ["3d", "scene", "rigging", "texturing", "glb"] },
  shader: { id: "shader", domains: ["shader", "3d", "ui", "motion"], capabilityTerms: ["shader", "webgl", "gradient"] },
  qa: { id: "qa", domains: ["testing", "observability", "agent-platform"], capabilityTerms: ["audit", "doctor", "verification", "visual-review", "browser"] },
  release: { id: "release", domains: ["deployment", "agent-platform"], capabilityTerms: ["deploy", "deployment", "preview", "release", "publish", "publishing"] },
  memory: { id: "memory", domains: ["project-memory", "code-search", "media-search", "agent-platform"], capabilityTerms: ["memory", "search", "context", "recall", "index"] },
};

function matchesCapability(capability: string, term: string) {
  const normalize = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).map((token) => token.replace(/s$/, "")).join(" ");
  return ` ${normalize(capability)} `.includes(` ${normalize(term)} `);
}

function inferLanes(goal: string): Lane[] {
  // Ignore common exclusion clauses; explicit lanes remain the escape hatch for ambiguous prose.
  const g = goal.toLowerCase().replace(/\b(?:no|without|avoid|skip|do not|don't)\b(?:(?!\b(?:but|then)\b)[^.;\n])*/g, " ");
  const ids = new Set<LaneId>(["code", "qa"]);
  const add = (id: LaneId, match: RegExp) => { if (new RegExp(`\\b(?:${match.source})\\b`).test(g)) ids.add(id); };
  add("ui", /ui|interfaces?|menus?|hud|screens?|pages?|cards?|layouts?|premium|visual|websites?|apps?/);
  add("motion", /motion|animations?|animate|animated|transitions?|smooth|camera|cinematic|movement|feel|juice/);
  add("sprite", /sprites?|spritesheets?|characters?|players?|batsman|bowler|fielder|pixels?|avatars?|enemy|enemies|npcs?/);
  add("audio", /audio|sounds?|music|voices?|commentary|sfx|soundtracks?/);
  add("3d", /3d|meshes|mesh|glb|gltf|rigging|threejs|three\.js/);
  add("shader", /shader|webgl|glow|lighting|gradient|fx|vfx/);
  add("memory", /context|remember|memory|search files|codebase|documents/);
  add("release", /ship|deploy|release|publish|live|production|preview/);

  return [...ids].map((id) => ({ ...laneCatalog[id], reason: `Selected from goal signals for ${id}.` }));
}

function scoreIntegration(integration: Integration, lane: Lane, readiness: ReturnType<typeof integrationReadiness>[number] | undefined, preference: WorkbenchPreference) {
  const matches = lane.capabilityTerms.filter((term) => integration.capabilities.some((capability) => matchesCapability(capability, term)));
  if (!matches.length) return 0;
  let score = 0;
  for (const domain of lane.domains) if (integration.domains.includes(domain)) score += 5;
  score += matches.length * 4;
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
  lanes?: LaneId[];
  detail?: "full" | "compact";
}) {
  const preference = input.preference ?? "quality";
  const maxCandidates = Math.max(1, Math.min(input.maxCandidatesPerLane ?? 3, 5));
  const registry = integrationRegistry();
  const readinessRows = integrationReadiness();
  const readinessById = new Map(readinessRows.map((row) => [row.id, row]));
  const lanes = input.lanes?.length
    ? [...new Set(input.lanes)].map((id) => ({ ...laneCatalog[id], reason: "Explicitly requested lane." }))
    : inferLanes(input.goal);
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
        matchedCapabilities: row.integration.capabilities.filter((capability) => lane.capabilityTerms.some((term) => matchesCapability(capability, term))),
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
          ? `Check provider health and the operation policy, then invoke ${primary.name} through Game Shop; configuration is not proof of a successful call.`
          : primary.mode === "stdio-mcp" || primary.mode === "desktop-mcp"
            ? `Use ${primary.name} from the local Codex workstation; Game Shop should coordinate the task and consume the resulting artifact.`
            : ["library", "platform-api", "installable"].includes(primary.mode ?? "")
              ? `Use ${primary.name} in the project workspace; it is not a hosted Game Shop call.`
              : primary.mode === "reference"
                ? `Consult ${primary.name} as reference material; no executable contract is registered.`
            : primary.authReady
              ? `Enable external integrations, then use ${primary.name}.`
              : `Prepare/authenticate ${primary.name}, otherwise use the first ready fallback.`
        : "No verified integration ranked strongly enough; keep this lane manual or run capability discovery.",
    };
  });

  const blockers = workflow
    .filter((step) => !step.primary || (!step.primary.callableNow && !step.fallbacks.some((f) => f.callableNow)))
    .map((step) => ({ lane: step.lane, reason: step.primary ? step.action : "No verified candidate." }));

  const immediate = workflow.filter((step) => step.primary?.callableNow).map((step) => ({ lane: step.lane, integration: step.primary!.id }));
  const local = workflow.filter((step) => step.primary && (step.primary.mode === "stdio-mcp" || step.primary.mode === "desktop-mcp")).map((step) => ({ lane: step.lane, integration: step.primary!.id }));

  return {
    version: "1.2",
    role: "project-aware mission router",
    project: project ? summarizeProject(project) : null,
    goal: input.goal,
    preference,
    workflow: input.detail === "compact" ? workflow.map((step) => ({
      ...step,
      primary: step.primary ? { ...step.primary, note: undefined, install: undefined, endpoint: undefined, kinds: undefined, state: undefined } : null,
      fallbacks: step.fallbacks.map((candidate) => ({ ...candidate, note: undefined, install: undefined, endpoint: undefined, kinds: undefined, state: undefined })),
    })) : workflow,
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

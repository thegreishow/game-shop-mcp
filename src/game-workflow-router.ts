export type GameWorkflowPhase = "create" | "upgrade" | "fix" | "audit" | "release";
export type GameRuntime = "auto" | "browser" | "unity" | "cinematic" | "hybrid";
export type GameWorkflowPreference = "quality" | "speed" | "cost" | "balanced";
export type GameNeed =
  | "gameplay"
  | "ui"
  | "2d-assets"
  | "3d-assets"
  | "3d-room"
  | "cinematic"
  | "story"
  | "physics"
  | "ai-navigation"
  | "multiplayer"
  | "visual-debug"
  | "performance"
  | "browser-qa"
  | "build-validation"
  | "deployment";

export type GameWorkflowRequest = {
  brief: string;
  phase?: GameWorkflowPhase;
  runtime?: GameRuntime;
  needs?: GameNeed[];
  preference?: GameWorkflowPreference;
  existingProject?: boolean;
};

export type WorkflowTargetId =
  | "game-shop"
  | "github"
  | "game-studio"
  | "game-development-studio"
  | "build-3d-game-rooms"
  | "unity"
  | "yoroll"
  | "tripo-3d";

type WorkflowTarget = {
  id: WorkflowTargetId;
  name: string;
  kind: "supervisor" | "source-control" | "workflow-plugin" | "local-cli-workflow" | "engine-workbench" | "remote-mcp" | "delegated-provider";
  executionSurface: string;
  capabilities: string[];
  requirements: string[];
  notes: string;
};

type WorkflowStage = {
  order: number;
  lane: string;
  owner: WorkflowTargetId;
  purpose: string;
  optional: boolean;
  gate?: string;
};

const TARGETS: Record<WorkflowTargetId, WorkflowTarget> = {
  "game-shop": {
    id: "game-shop",
    name: "Game Shop MCP",
    kind: "supervisor",
    executionSurface: "remote MCP / GitHub-controlled orchestration",
    capabilities: ["project-context", "routing", "governance", "qa-evidence", "release-gates", "artifact-lifecycle", "provider-controls"],
    requirements: ["registered project for project-scoped mutation"],
    notes: "Traffic controller and evidence boundary. It should coordinate specialists without becoming a mandatory dependency for direct provider access.",
  },
  github: {
    id: "github",
    name: "GitHub",
    kind: "source-control",
    executionSurface: "GitHub API / repository",
    capabilities: ["source-of-truth", "branch", "diff", "pull-request", "ci", "rollback"],
    requirements: ["repository access"],
    notes: "Canonical code/history plane. Game Shop mutations remain project-root scoped and branch verified.",
  },
  "game-studio": {
    id: "game-studio",
    name: "Game Studio",
    kind: "workflow-plugin",
    executionSurface: "Codex / browser-game workspace",
    capabilities: ["browser-game-design", "phaser", "threejs", "react-three-fiber", "game-ui", "sprite-pipeline", "browser-playtest"],
    requirements: ["project workspace for implementation or playtest"],
    notes: "Default production lane for browser games. Preserve a working browser runtime instead of migrating to Unity merely because Unity is available.",
  },
  "game-development-studio": {
    id: "game-development-studio",
    name: "Game Development Studio",
    kind: "local-cli-workflow",
    executionSurface: "Codex/local game-dev CLI",
    capabilities: ["asset-production", "asset-vendoring", "visual-debugging", "performance-optimization", "blender", "glb", "pbr"],
    requirements: ["local game-dev CLI", "explicit authorization before file-writing commands", "separate approval for provider spend or hardware capture"],
    notes: "Use for durable asset production and evidence-driven visual/performance diagnosis. Credentials stay outside conversation and command payloads.",
  },
  "build-3d-game-rooms": {
    id: "build-3d-game-rooms",
    name: "Build 3D Game Rooms",
    kind: "workflow-plugin",
    executionSurface: "Codex/local Blender + guarded asset pipeline",
    capabilities: ["room-design", "prop-spec", "mesh-generation", "blender-composition", "runtime-export", "room-validation"],
    requirements: ["Function approval", "Form approval before export", "Runtime approval before publish", "explicit spend approval for paid mesh generation"],
    notes: "Environment-specialist lane. Function, Form and Runtime gates remain blocking; successful generation is not equivalent to runtime approval.",
  },
  unity: {
    id: "unity",
    name: "Unity + Unity Workbench",
    kind: "engine-workbench",
    executionSurface: "Codex with Unity project workspace / connected Unity Editor",
    capabilities: ["physics", "animation", "navigation", "multiplayer", "ui", "live-services", "bug-investigation", "project-health", "build-validation"],
    requirements: ["Unity project workspace for inspection", "one validated Unity MCP bridge when Editor automation is needed"],
    notes: "Use when the game genuinely benefits from Unity systems or already lives in Unity. Game Shop should route/handoff; its hosted runtime must not pretend it can inspect a local Editor.",
  },
  yoroll: {
    id: "yoroll",
    name: "Yoroll",
    kind: "remote-mcp",
    executionSurface: "Yoroll MCP + DEV workbench",
    capabilities: ["interactive-film-game", "branching-story", "choices", "qte", "image-generation", "video-generation", "workflow-editing", "publishing"],
    requirements: ["OAuth for protected actions", "explicit confirmation before credit-consuming calls"],
    notes: "Cinematic/narrative specialist. Use its MCP as source of truth; visible browser workbench is not the business-state authority.",
  },
  "tripo-3d": {
    id: "tripo-3d",
    name: "Tripo 3D",
    kind: "delegated-provider",
    executionSurface: "delegated through Game Development Studio asset-production workflow",
    capabilities: ["3d-generation", "reference-to-3d", "game-asset-source"],
    requirements: ["provider configured in user-controlled local environment", "explicit paid-provider authorization and spend ceiling when billable"],
    notes: "Treat as an optional asset provider, not the game engine. Normalize, inspect and validate output before it becomes a canonical game asset.",
  },
};

const UNITY_NEEDS = new Set<GameNeed>(["physics", "ai-navigation", "multiplayer", "build-validation"]);
const CINEMATIC_NEEDS = new Set<GameNeed>(["cinematic", "story"]);
const LOCAL_DIAGNOSTIC_NEEDS = new Set<GameNeed>(["visual-debug", "performance"]);

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function inferRuntime(request: GameWorkflowRequest): Exclude<GameRuntime, "auto"> {
  if (request.runtime && request.runtime !== "auto") return request.runtime;
  const needs = new Set(request.needs ?? []);
  if ([...UNITY_NEEDS].some((need) => needs.has(need))) return "unity";
  if (needs.has("cinematic") && needs.has("story")) return "cinematic";
  if (needs.has("cinematic") && (needs.has("gameplay") || needs.has("3d-assets") || needs.has("3d-room"))) return "hybrid";
  return "browser";
}

function pushStage(stages: WorkflowStage[], lane: string, owner: WorkflowTargetId, purpose: string, optional = false, gate?: string) {
  if (stages.some((stage) => stage.lane === lane && stage.owner === owner && stage.purpose === purpose)) return;
  stages.push({ order: stages.length + 1, lane, owner, purpose, optional, ...(gate ? { gate } : {}) });
}

export function routeGameWorkflow(request: GameWorkflowRequest) {
  const phase = request.phase ?? (request.existingProject ? "upgrade" : "create");
  const preference = request.preference ?? "balanced";
  const runtime = inferRuntime(request);
  const needs = new Set<GameNeed>(request.needs ?? ["gameplay"]);
  const stages: WorkflowStage[] = [];
  const specialists: WorkflowTargetId[] = [];
  const gates: string[] = [];
  const cautions: string[] = [];

  pushStage(stages, "supervision", "game-shop", "Resolve project context, classify the task, establish safety/spend/write gates and preserve evidence.");
  pushStage(stages, "source", "github", phase === "audit" ? "Inspect the existing source revision read-only; do not create branches or modify files." : request.existingProject ? "Inspect the existing source of truth before mutation." : "Establish the source-of-truth branch/repository before implementation.");

  const include = (id: WorkflowTargetId) => {
    if (id !== "game-shop" && id !== "github") specialists.push(id);
  };

  if (phase === "audit") {
    const owner = runtime === "unity" ? "unity" : runtime === "cinematic" ? "yoroll" : "game-studio";
    include(owner);
    pushStage(stages, "audit", owner, "Inspect the existing project and runtime read-only; reproduce issues and report evidence-backed findings without implementing changes or generating assets.");
  } else if (runtime === "browser") {
    include("game-studio");
    pushStage(stages, "runtime", "game-studio", phase === "fix" ? "Reproduce and repair the browser gameplay/runtime without changing engines by default." : "Design or implement the browser game using the existing stack; default new 2D work to Phaser and explicit 3D work to Three.js/R3F.");
  } else if (runtime === "unity") {
    include("unity");
    pushStage(stages, "runtime", "unity", phase === "fix" ? "Use Unity Workbench bug investigation against the real project and Editor state." : "Use the Unity project/workbench lane for engine systems, scenes, prefabs and gameplay implementation.", false, "unity-workspace");
    gates.push("unity-workspace: inspect the real Unity project before claiming Editor/project state; use one validated Unity MCP bridge for Editor automation.");
  } else if (runtime === "cinematic") {
    include("yoroll");
    pushStage(stages, "runtime", "yoroll", "Author the interactive film-game, branching choices/QTEs and cinematic workflow through Yoroll.", false, "yoroll-oauth-and-credit-confirmation");
    gates.push("yoroll-generation: protected/credit-consuming Yoroll actions require OAuth plus explicit confirmation immediately before spend.");
  } else {
    include("game-studio");
    include("yoroll");
    pushStage(stages, "runtime", "game-studio", "Keep the playable runtime in the browser-game stack and define clean media/story integration boundaries.");
    pushStage(stages, "cinematic", "yoroll", "Produce branching/cinematic sequences as a specialist lane, then hand durable outputs back to the runtime.", true, "yoroll-oauth-and-credit-confirmation");
    gates.push("hybrid-boundary: Yoroll media/story state must not become an opaque replacement for the canonical game source.");
  }

  if (phase !== "audit" && needs.has("3d-room")) {
    include("build-3d-game-rooms");
    include("game-development-studio");
    pushStage(stages, "environment", "build-3d-game-rooms", "Design, validate and compose the 3D room/environment through Function, Form and Runtime gates.", false, "function-form-runtime-approvals");
    pushStage(stages, "asset-finalization", "game-development-studio", "Inspect, normalize and package room/prop assets for the selected runtime after room approval.", false, "local-write-authorization");
    gates.push("room-gates: Function approval before paid mesh work, Form approval before export, Runtime approval before publish.");
  }

  if (phase !== "audit" && needs.has("3d-assets")) {
    include("game-development-studio");
    include("tripo-3d");
    pushStage(stages, "3d-assets", "game-development-studio", "Define game-ready dimensions/topology/texture budgets, generate or ingest assets, inspect bytes, normalize only when justified, and package provenance.");
    pushStage(stages, "3d-provider", "tripo-3d", "Use Tripo as an optional delegated source for 3D generation when it is configured and explicitly authorized.", true, "paid-provider-spend");
    gates.push("3d-provider-spend: provider credentials remain outside chat; billable generation requires explicit authorization and a spend ceiling.");
  }

  if (phase !== "audit" && needs.has("2d-assets")) {
    if (runtime === "browser" || runtime === "hybrid") {
      include("game-studio");
      pushStage(stages, "2d-assets", "game-studio", "Use the sprite pipeline for consistent 2D character/effect generation, normalization and previews.");
    } else {
      cautions.push("2D asset work should use an engine-appropriate asset pipeline; do not force browser-specific sprite tooling into Unity without validating import/runtime requirements.");
    }
  }

  if ([...LOCAL_DIAGNOSTIC_NEEDS].some((need) => needs.has(need))) {
    include("game-development-studio");
    if (needs.has("visual-debug")) pushStage(stages, "diagnostics", "game-development-studio", "Capture reproducible offscreen evidence and diagnose renderer/visual regressions before editing.", false, "reproducible-adapter");
    if (needs.has("performance")) pushStage(stages, "performance", "game-development-studio", phase === "audit" ? "Measure baseline runtime performance read-only and report bottlenecks without applying optimizations." : "Compare sealed baseline/candidate telemetry and run bounded optimization only against measurable goals.", false, "measurable-baseline");
  }

  if (phase !== "audit" && runtime === "unity" && (needs.has("physics") || needs.has("ai-navigation") || needs.has("multiplayer"))) {
    const capabilities = [needs.has("physics") ? "physics" : null, needs.has("ai-navigation") ? "AI navigation" : null, needs.has("multiplayer") ? "multiplayer services" : null].filter(Boolean).join(", ");
    pushStage(stages, "engine-systems", "unity", `Implement or diagnose ${capabilities} through the relevant Unity specialist workflows and validate in the real project.`);
  }

  if (runtime === "browser" || runtime === "hybrid" || needs.has("browser-qa")) {
    include("game-studio");
    pushStage(stages, "qa", "game-studio", "Run browser playtests and validate the player-visible result, controls, overlays and regressions.");
  }
  if (runtime === "unity" || needs.has("build-validation")) {
    include("unity");
    pushStage(stages, "qa", "unity", "Validate compilation, Console state, tests, scenes/prefabs and target build readiness before calling the work complete.", false, "unity-workspace");
  }

  if (phase === "release" || (phase !== "audit" && needs.has("deployment"))) {
    pushStage(stages, "release", "game-shop", "Apply QA/release governance and reject unresolved blocking regressions.");
    pushStage(stages, "release", "github", "Verify branch scope, review CI/evidence, then open or merge the reviewed pull request according to release policy.");
  } else {
    pushStage(stages, "handoff", "game-shop", "Collect specialist evidence/artifacts, verify project scope and produce the next safe action rather than silently deploying.");
  }

  if (runtime === "browser" && request.runtime === "auto") cautions.push("Browser is the default lane when no requirement justifies an engine migration.");
  if (request.existingProject) cautions.push("Prefer incremental repair/refactor of the registered project over a rewrite or engine migration.");

  const orderedSpecialists = unique(specialists);
  const primaryLane = runtime === "unity" ? "unity" : runtime === "cinematic" ? "yoroll" : "game-studio";
  return {
    version: 1,
    brief: request.brief,
    phase,
    requestedRuntime: request.runtime ?? "auto",
    selectedRuntime: runtime,
    preference,
    needs: [...needs],
    primaryLane,
    specialists: orderedSpecialists.map((id) => TARGETS[id]),
    stages: stages.map((stage, index) => ({ ...stage, order: index + 1, target: TARGETS[stage.owner] })),
    gates: unique(gates),
    cautions: unique(cautions),
    policies: {
      noEngineMigrationByAvailability: true,
      noAutomaticPaidFallbackAfterAmbiguousSubmission: true,
      secretsStayOutsideConversation: true,
      externalExecutionIndependentFromGitHubWrites: true,
      paidGenerationIndependentFromExternalExecution: true,
      qaBeforeRelease: true,
    },
  };
}

export function gameWorkflowMatrix() {
  return {
    version: 1,
    principle: "Game Shop is the traffic controller; each specialist owns the work it is strongest at, and no tool is added to a game merely because it is available.",
    runtimeDefaults: {
      browser: "Game Studio (Phaser for default 2D; Three.js/R3F for explicit 3D)",
      unity: "Unity + Unity Workbench when engine-native systems or an existing Unity project justify it",
      cinematic: "Yoroll for interactive-film/branching/QTE workflows",
      hybrid: "Game Studio owns playable runtime; Yoroll is an optional cinematic/story specialist",
    },
    targets: Object.values(TARGETS),
    assetRouting: {
      "2d": ["game-studio"],
      "3d": ["game-development-studio", "tripo-3d"],
      environments: ["build-3d-game-rooms", "game-development-studio"],
    },
    diagnostics: {
      browser: ["game-studio"],
      unity: ["unity"],
      "visual-performance": ["game-development-studio"],
    },
    release: ["game-shop", "github"],
  };
}

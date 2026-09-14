import { routeMultiDomain, type Domain, type Preference } from "./multidomain-router.js";

export type WebsiteWorkflowPhase = "create" | "upgrade" | "fix" | "audit" | "release";
export type WebsiteKind = "auto" | "landing" | "marketing" | "artist" | "portfolio" | "content" | "ecommerce" | "web-app" | "experiential";
export type WebsiteFramework = "react" | "vanilla" | "vue" | "any";
export type WebsiteNeed =
  | "ui"
  | "motion"
  | "seo"
  | "accessibility"
  | "performance"
  | "forms"
  | "media"
  | "cms"
  | "auth"
  | "data"
  | "backend"
  | "commerce"
  | "3d"
  | "shader"
  | "video"
  | "analytics"
  | "observability"
  | "browser-qa"
  | "deployment";

export type WebsiteWorkflowRequest = {
  brief: string;
  phase?: WebsiteWorkflowPhase;
  kind?: WebsiteKind;
  framework?: WebsiteFramework;
  needs?: WebsiteNeed[];
  preference?: Preference;
  existingProject?: boolean;
};

type WebsiteStage = {
  order: number;
  lane: string;
  owner: string;
  purpose: string;
  optional: boolean;
  gate?: string;
  routedEngine?: string | null;
};

type RoutedCapability = {
  domain: Domain;
  capability: string;
  selected: string | null;
  alternatives: string[];
};

const DEFAULT_NEEDS: Record<Exclude<WebsiteKind, "auto">, WebsiteNeed[]> = {
  landing: ["ui", "motion", "seo", "accessibility", "performance", "forms", "browser-qa", "deployment"],
  marketing: ["ui", "motion", "seo", "accessibility", "performance", "forms", "media", "analytics", "browser-qa", "deployment"],
  artist: ["ui", "motion", "seo", "accessibility", "performance", "forms", "media", "browser-qa", "deployment"],
  portfolio: ["ui", "motion", "seo", "accessibility", "performance", "media", "browser-qa", "deployment"],
  content: ["ui", "seo", "accessibility", "performance", "media", "cms", "browser-qa", "deployment"],
  ecommerce: ["ui", "motion", "seo", "accessibility", "performance", "media", "data", "backend", "auth", "commerce", "analytics", "observability", "browser-qa", "deployment"],
  "web-app": ["ui", "accessibility", "performance", "data", "backend", "auth", "analytics", "observability", "browser-qa", "deployment"],
  experiential: ["ui", "motion", "seo", "accessibility", "performance", "media", "3d", "shader", "browser-qa", "deployment"],
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function inferKind(request: WebsiteWorkflowRequest): Exclude<WebsiteKind, "auto"> {
  if (request.kind && request.kind !== "auto") return request.kind;
  const needs = new Set(request.needs ?? []);
  if (needs.has("commerce")) return "ecommerce";
  if (needs.has("3d") || needs.has("shader")) return "experiential";
  if (needs.has("auth") || needs.has("data") || needs.has("backend") || needs.has("observability")) return "web-app";
  if (needs.has("cms")) return "content";
  if (needs.has("media")) return "artist";
  return "landing";
}

function routed(domain: Domain, capability: string, preference: Preference, framework: WebsiteFramework): RoutedCapability {
  const result = routeMultiDomain({ domain, capability, preference, framework });
  return {
    domain,
    capability,
    selected: result.selected?.id ?? null,
    alternatives: result.alternatives.slice(0, 3).map((candidate) => candidate.id),
  };
}

function pushStage(
  stages: WebsiteStage[],
  lane: string,
  owner: string,
  purpose: string,
  optional = false,
  gate?: string,
  routedEngine?: string | null,
) {
  if (stages.some((stage) => stage.lane === lane && stage.owner === owner && stage.purpose === purpose)) return;
  stages.push({
    order: stages.length + 1,
    lane,
    owner,
    purpose,
    optional,
    ...(gate ? { gate } : {}),
    ...(routedEngine !== undefined ? { routedEngine } : {}),
  });
}

export function routeWebsiteWorkflow(request: WebsiteWorkflowRequest) {
  const phase = request.phase ?? (request.existingProject ? "upgrade" : "create");
  const kind = inferKind(request);
  const framework = request.framework ?? "any";
  const preference = request.preference ?? "quality";
  const needs = new Set<WebsiteNeed>(request.needs?.length ? request.needs : DEFAULT_NEEDS[kind]);
  const stages: WebsiteStage[] = [];
  const routes: RoutedCapability[] = [];
  const gates: string[] = [];
  const cautions: string[] = [];

  pushStage(stages, "supervision", "game-shop", "Resolve project context, classify the website task, establish write/external/spend/release gates and preserve evidence.");
  pushStage(stages, "source", "github", request.existingProject ? "Inspect the existing repository and current production shape before mutation." : "Establish GitHub as the source of truth before implementation.");

  if (request.existingProject || phase === "fix" || phase === "audit") {
    pushStage(stages, "inspection", "project-workspace", "Inspect the current implementation, dependencies, routes, responsive behavior and deployment contract before proposing changes.");
    cautions.push("Prefer the smallest evidence-backed repair or refactor over a rewrite, framework migration or visual reset.");
  }

  const addRoute = (domain: Domain, capability: string) => {
    const route = routed(domain, capability, preference, framework);
    routes.push(route);
    return route.selected;
  };

  const designEngine = addRoute("design-reference", "design-guidance");
  pushStage(stages, "design-direction", designEngine ?? "project-workspace", "Establish or preserve the visual system, hierarchy, spacing, typography and interaction intent before styling individual sections.", false, undefined, designEngine);

  if (needs.has("ui")) {
    const componentEngine = addRoute("ui", "component");
    const layoutEngine = addRoute("ui", "layout");
    pushStage(stages, "frontend", componentEngine ?? "project-workspace", "Build or repair reusable UI components through the routed frontend/UI system; keep licensed registry source in the target project only.", false, undefined, componentEngine);
    if (layoutEngine && layoutEngine !== componentEngine) pushStage(stages, "layout", layoutEngine, "Use the routed layout system only where it improves structure without introducing redundant UI stacks.", true, undefined, layoutEngine);
  }

  if (needs.has("motion")) {
    const motionEngine = addRoute("motion", kind === "experiential" ? "timeline" : "micro-interaction");
    pushStage(stages, "motion", motionEngine ?? "project-workspace", "Add purposeful motion after layout is stable. Protect readability, input responsiveness and reduced-motion behavior.", false, "motion-performance-budget", motionEngine);
    gates.push("motion-performance-budget: motion must not block input, accessibility or target performance budgets.");
  }

  if (needs.has("3d") || needs.has("shader")) {
    const sceneEngine = needs.has("3d") ? addRoute("3d", "scene") : null;
    const shaderEngine = needs.has("shader") ? addRoute("shader", "shader") : null;
    if (needs.has("3d")) pushStage(stages, "experiential-3d", sceneEngine ?? "project-workspace", "Use 3D only for a defined experiential purpose and isolate it from essential content/navigation.", false, "web-3d-performance-and-fallback", sceneEngine);
    if (needs.has("shader")) pushStage(stages, "shader", shaderEngine ?? "project-workspace", "Use shader effects as progressive enhancement with a simpler fallback path.", true, "web-3d-performance-and-fallback", shaderEngine);
    gates.push("web-3d-performance-and-fallback: essential content and navigation must remain usable if advanced graphics are unavailable or reduced.");
  }

  if (needs.has("media")) {
    const mediaEngine = addRoute("storage", "asset-delivery");
    pushStage(stages, "media", mediaEngine ?? "project-workspace", "Normalize media ownership, responsive delivery, caching and loading behavior; avoid embedding oversized source assets directly in pages.", false, undefined, mediaEngine);
  }

  if (needs.has("video")) {
    const videoEngine = addRoute("video", "video");
    pushStage(stages, "video", videoEngine ?? "project-workspace", "Use authored or generated video only when it materially serves the page; preserve poster/fallback behavior and loading budgets.", true, "external-and-spend-gates", videoEngine);
    gates.push("external-and-spend-gates: any billable or external generation still requires the existing Game Shop authorization/spend controls.");
  }

  const needsBackend = needs.has("backend") || needs.has("data") || needs.has("auth") || needs.has("cms") || needs.has("forms") && kind !== "landing";
  if (needsBackend) {
    const backendEngine = addRoute("backend", "serverless");
    pushStage(stages, "backend", backendEngine ?? "project-workspace", "Add backend behavior only for actual product requirements; keep purely presentational sites static when possible.", false, undefined, backendEngine);
  }

  if (needs.has("data") || needs.has("cms")) {
    const dataEngine = addRoute("data", "database");
    pushStage(stages, "data", dataEngine ?? "project-workspace", needs.has("cms") ? "Define a durable content model and editing source instead of hard-coding content that must be managed frequently." : "Define durable data contracts and migrations before wiring UI state.", false, "data-contract", dataEngine);
  }

  if (needs.has("auth")) {
    const authEngine = addRoute("auth", "authentication");
    pushStage(stages, "auth", authEngine ?? "project-workspace", "Use a real authentication/session boundary; do not substitute mock frontend state for authorization.", false, "auth-security", authEngine);
    gates.push("auth-security: authorization-sensitive behavior must be enforced server-side and verified independently of UI state.");
  }

  if (needs.has("commerce")) {
    const commerceEngine = addRoute("commerce", "checkout");
    pushStage(stages, "commerce", commerceEngine ?? "project-workspace", "Implement checkout/payments through the verified commerce provider and keep payment state authoritative on the server/provider side.", false, "commerce-intent-and-auth", commerceEngine);
    gates.push("commerce-intent-and-auth: payment/product mutations require explicit intent, credentials and provider-safe execution paths.");
  }

  if (needs.has("forms")) {
    pushStage(stages, "forms", "project-workspace", "Implement forms with validation, useful error/success states, spam/abuse considerations and a real destination only when submission persistence is required.");
  }

  if (needs.has("seo")) {
    pushStage(stages, "seo", "project-workspace", "Verify semantic headings, metadata, canonical URLs, robots/sitemap behavior, social previews and indexability without turning SEO into a redesign.");
  }

  if (needs.has("accessibility")) {
    pushStage(stages, "accessibility", "project-workspace", "Protect keyboard access, focus states, semantic structure, contrast, labels, reduced motion and meaningful alternative text as part of implementation—not a final cosmetic pass.");
  }

  if (needs.has("analytics")) {
    pushStage(stages, "analytics", "project-workspace", "Instrument only decision-useful events and preserve consent/privacy boundaries; analytics must not become a blocking dependency for core UX.", true);
  }

  if (needs.has("performance") || needs.has("observability")) {
    const performanceEngine = addRoute("observability", needs.has("performance") ? "performance" : "logs");
    pushStage(stages, "performance-observability", performanceEngine ?? "project-workspace", needs.has("performance") ? "Measure page/runtime behavior with reproducible evidence, then optimize the largest verified regressions first." : "Verify logs and runtime signals needed to diagnose production behavior.", false, "measured-baseline", performanceEngine);
    gates.push("measured-baseline: do not claim a performance improvement without comparable before/after evidence.");
  }

  if (needs.has("browser-qa") || phase === "audit" || phase === "fix" || phase === "release") {
    const qaEngine = addRoute("testing", "browser-test");
    pushStage(stages, "qa", qaEngine ?? "project-workspace", "Run deterministic browser verification across critical paths, responsive breakpoints, console/network failures, interactions and regressions.", false, "independent-browser-evidence", qaEngine);
    gates.push("independent-browser-evidence: implementation is not complete until the player/user-visible result is independently verified.");
  }

  if (phase === "release" || needs.has("deployment")) {
    const deployEngine = addRoute("deployment", "preview");
    pushStage(stages, "preview", deployEngine ?? "project-workspace", "Deploy or inspect a preview first and verify the real hosted result before production promotion.", false, "preview-before-production", deployEngine);
    pushStage(stages, "release", "game-shop", "Apply release governance and reject unresolved blocking regressions, scope drift or missing evidence.");
    pushStage(stages, "release", "github", "Verify branch scope, CI and review evidence before merge/release.");
    gates.push("preview-before-production: production deployment remains a separate explicit release decision.");
  } else {
    pushStage(stages, "handoff", "game-shop", "Collect evidence, verify project scope and return the next safe action rather than silently deploying to production.");
  }

  if ((kind === "landing" || kind === "portfolio" || kind === "artist") && !needs.has("backend") && !needs.has("data") && !needs.has("auth")) {
    cautions.push("Keep the site static/client-side where possible; do not introduce a database/auth/backend simply because those capabilities exist.");
  }
  if (kind !== "experiential" && !needs.has("3d") && !needs.has("shader")) {
    cautions.push("Do not introduce Three.js/Spline/shader infrastructure unless the experience has a specific 3D or shader requirement.");
  }
  if (kind !== "ecommerce" && !needs.has("commerce")) cautions.push("Do not introduce Stripe/commerce dependencies unless the product actually sells or bills for something.");

  return {
    version: 1,
    brief: request.brief,
    phase,
    requestedKind: request.kind ?? "auto",
    selectedKind: kind,
    framework,
    preference,
    needs: [...needs],
    routes,
    stages: stages.map((stage, index) => ({ ...stage, order: index + 1 })),
    gates: unique(gates),
    cautions: unique(cautions),
    policies: {
      sourceOfTruth: "GitHub/project repository remains canonical.",
      preview: "Preview before production for release work.",
      mutation: "Writes remain project-root scoped on controlled branches.",
      spend: "Routing never grants paid-generation permission.",
      external: "Routing never grants external execution permission.",
      migration: "Existing sites should be repaired incrementally unless evidence justifies a framework or architecture migration.",
    },
  };
}

export function websiteWorkflowMatrix() {
  return {
    version: 1,
    kinds: Object.keys(DEFAULT_NEEDS),
    defaults: DEFAULT_NEEDS,
    phases: ["create", "upgrade", "fix", "audit", "release"],
    needs: [
      "ui", "motion", "seo", "accessibility", "performance", "forms", "media", "cms", "auth", "data", "backend", "commerce", "3d", "shader", "video", "analytics", "observability", "browser-qa", "deployment",
    ],
    orchestration: {
      supervisor: "Game Shop MCP",
      sourceOfTruth: "GitHub",
      frontend: "routed through the existing multidomain UI/motion/design engines",
      backend: "only when actual data/auth/server requirements exist",
      experiential: "3D/shaders are opt-in, not default website dependencies",
      qa: "deterministic browser evidence before release",
      release: "preview first; production requires a separate explicit decision",
    },
  };
}

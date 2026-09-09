import { routeBuild, type BuildDomain, type BuildPreference } from "./multi-router.js";

export type ProductKind = "website" | "web-app" | "browser-game" | "mobile-app" | "interactive-experience" | "digital-product";
export type BuildGoal = "premium" | "cinematic" | "playful" | "minimal" | "immersive" | "conversion" | "performance";
export type BuildPlanRequest = {
  brief: string;
  product: ProductKind;
  goals?: BuildGoal[];
  framework?: "react" | "next" | "vanilla" | "vue" | "phaser" | "three" | "any";
  preference?: BuildPreference;
  includeDomains?: BuildDomain[];
};

type PlanStep = {
  id: string;
  phase: "foundation" | "visual-system" | "interaction" | "scene" | "media" | "polish" | "qa";
  domain: BuildDomain;
  capability: string;
  engine: string | null;
  install?: string;
  action: string;
  dependsOn: string[];
};

const domainCapabilities: Record<BuildDomain, string[]> = {
  ui: ["component", "design-system"],
  motion: ["micro-interaction", "timeline", "smooth-scroll"],
  "3d": ["web-3d", "interactive-3d"],
  shader: ["webgl-shader", "webgpu"],
  video: ["motion-design", "web-animation"],
  "design-reference": ["award-inspiration", "design-guidance"],
  "agent-platform": ["agent-builder", "agent-ui-builder"],
};

function frameworkForRouter(framework: BuildPlanRequest["framework"]) {
  if (framework === "next") return "react" as const;
  if (framework === "phaser") return "phaser-overlay" as const;
  if (framework === "three") return "vanilla" as const;
  return framework ?? "any";
}

function defaultDomains(product: ProductKind, goals: BuildGoal[]) : BuildDomain[] {
  const base: BuildDomain[] = ["ui", "motion", "design-reference"];
  if (["browser-game", "interactive-experience"].includes(product) || goals.includes("immersive") || goals.includes("cinematic")) base.push("3d", "shader");
  if (goals.includes("cinematic") || goals.includes("conversion")) base.push("video");
  return [...new Set(base)];
}

export function createBuildPlan(request: BuildPlanRequest) {
  const goals = request.goals?.length ? request.goals : ["premium"];
  const domains = request.includeDomains?.length ? request.includeDomains : defaultDomains(request.product, goals);
  const preference = request.preference ?? (goals.includes("performance") ? "performance" : goals.includes("premium") || goals.includes("cinematic") ? "quality" : "balanced");
  const framework = frameworkForRouter(request.framework);
  const steps: PlanStep[] = [];

  for (const domain of domains) {
    const capabilities = domainCapabilities[domain] ?? [];
    for (const capability of capabilities) {
      const routed = routeBuild({ domain, capability, preference, framework });
      const selected = routed.selected;
      const phase: PlanStep["phase"] = domain === "ui" ? "visual-system" : domain === "motion" ? "interaction" : domain === "3d" || domain === "shader" ? "scene" : domain === "video" ? "media" : "foundation";
      const id = `${domain}-${capability}`;
      steps.push({
        id,
        phase,
        domain,
        capability,
        engine: selected?.engine ?? null,
        install: selected?.install,
        action: selected ? `Use ${selected.engine} for ${capability}. ${selected.notes}` : `No verified engine is currently routed for ${capability}; keep this step manual until an adapter/library is verified.`,
        dependsOn: phase === "foundation" ? [] : steps.filter((s) => s.phase === "foundation" || s.phase === "visual-system").map((s) => s.id).slice(0, 3),
      });
    }
  }

  const installs = [...new Set(steps.map((s) => s.install).filter((x): x is string => Boolean(x)))];
  return {
    version: "1.0",
    brief: request.brief,
    product: request.product,
    goals,
    framework: request.framework ?? "any",
    preference,
    domains,
    installs,
    steps,
    executionPolicy: {
      paidGeneration: "respect GAME_SHOP_ALLOW_PAID_GENERATION; never infer billing permission from this plan",
      externalServices: "use only configured/authorized services; request credentials or user approval when required",
      libraries: "install in the target project, not in the Game Shop gateway unless the gateway itself imports them",
      registries: "use official registries and preserve license restrictions; never mirror licensed source",
    },
  };
}

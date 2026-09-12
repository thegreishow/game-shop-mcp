import { getProjectOverlay, listProjectOverlays } from "./project-overlay.js";

export type GameProjectContext = {
  id: string;
  name?: string;
  repo: string;
  defaultBranch: string;
  framework?: string;
  projectPath?: string;
  gamePath?: string;
  productKind?: string;
  artStyle?: string;
  notes?: string;
  verifyPaths?: string[];
};

export type ProjectContext = GameProjectContext;

function normalizeProject(value: ProjectContext): ProjectContext {
  const projectPath = value.projectPath || value.gamePath;
  return {
    ...value,
    projectPath,
    gamePath: value.gamePath || projectPath,
    productKind: value.productKind || value.framework || "other",
  };
}

// Project existence and repository roots are authoritative only when hydrated
// from arcade/games/games.json. Operational registries may enrich these
// overlays, but they cannot introduce projects independently.
export function listProjects() {
  return listProjectOverlays().map(normalizeProject);
}

export function getProject(id: string) {
  const overlay = getProjectOverlay(id);
  if (!overlay) {
    throw new Error("Project is not present in the canonical Game Shop arcade registry.");
  }
  return normalizeProject(overlay);
}

export function projectContext(id: string) {
  const project = getProject(id);
  const githubReadToken = process.env.GAME_SHOP_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  return {
    ...project,
    execution: {
      githubReadConfigured: Boolean(githubReadToken),
      githubCredential: githubReadToken
        ? process.env.GAME_SHOP_GITHUB_TOKEN
          ? "GAME_SHOP_GITHUB_TOKEN"
          : "GITHUB_TOKEN"
        : null,
      githubWritesAllowed: process.env.GAME_SHOP_ALLOW_GITHUB_WRITES === "true",
      externalIntegrationsAllowed: process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true",
      paidGenerationAllowed: process.env.GAME_SHOP_ALLOW_PAID_GENERATION === "true",
    },
  };
}

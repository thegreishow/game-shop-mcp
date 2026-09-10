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

const CORE_PROJECTS: ProjectContext[] = [
  {
    id: "dubai-legends",
    name: "Dubai Legends",
    repo: "thegreishow/thegreishow.com",
    defaultBranch: "main",
    framework: "browser-game",
    productKind: "browser-game",
    projectPath: "arcade/games/dubai-legends",
    gamePath: "arcade/games/dubai-legends",
    artStyle: "cinematic arcade cricket",
    notes: "Cricket game. Prioritize stability, natural player motion, batting/bowling/fielding animation and cinematic match presentation.",
    verifyPaths: ["arcade/games/dubai-legends"],
  },
  {
    id: "dreamweaver-oracle",
    name: "Dreamweaver Oracle",
    repo: "thegreishow/thegreishow.com",
    defaultBranch: "main",
    framework: "browser-game",
    productKind: "browser-game",
    projectPath: "arcade/games/dreamweaver-oracle",
    gamePath: "arcade/games/dreamweaver-oracle",
    artStyle: "psychedelic cosmic arcade",
    notes: "Space-action game. Preserve established world/animation language while improving character, motion, audio and gameplay polish.",
    verifyPaths: ["arcade/games/dreamweaver-oracle"],
  },
  {
    id: "rodeo",
    name: "Rodeo: Are You Ready?",
    repo: "thegreishow/thegreishow.com",
    defaultBranch: "main",
    framework: "browser-game",
    productKind: "browser-game",
    projectPath: "arcade/games/rodeo-are-you-ready",
    gamePath: "arcade/games/rodeo-are-you-ready",
    artStyle: "cinematic western music arcade",
    notes: "Rodeo game tied to The Grei Show release/promo world. Preserve music identity while improving characters, gameplay and premium presentation.",
    verifyPaths: ["arcade/games/rodeo-are-you-ready"],
  },
];

function normalizeProject(value: ProjectContext): ProjectContext {
  const projectPath = value.projectPath || value.gamePath;
  return {
    ...value,
    projectPath,
    gamePath: value.gamePath || projectPath,
    productKind: value.productKind || value.framework || "other",
  };
}

function configuredProjects(): ProjectContext[] {
  const raw = process.env.GAME_SHOP_PROJECTS_JSON;
  if (!raw) return CORE_PROJECTS.map(normalizeProject);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return CORE_PROJECTS.map(normalizeProject);
    const extra = parsed.filter((value): value is ProjectContext =>
      Boolean(value && typeof value.id === "string" && typeof value.repo === "string" && typeof value.defaultBranch === "string"),
    ).map(normalizeProject);
    const merged = new Map(CORE_PROJECTS.map((project) => [project.id, normalizeProject(project)]));
    for (const project of extra) merged.set(project.id, project);
    return [...merged.values()];
  } catch {
    return CORE_PROJECTS.map(normalizeProject);
  }
}

export function listProjects() { return configuredProjects(); }

export function getProject(id: string) {
  const project = configuredProjects().find((candidate) => candidate.id === id);
  if (!project) throw new Error("Project is not configured in the Game Shop allowlist.");
  return project;
}

export function projectContext(id: string) {
  const project = getProject(id);
  const githubReadToken = process.env.GAME_SHOP_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  return {
    ...project,
    execution: {
      githubReadConfigured: Boolean(githubReadToken),
      githubCredential: githubReadToken ? (process.env.GAME_SHOP_GITHUB_TOKEN ? "GAME_SHOP_GITHUB_TOKEN" : "GITHUB_TOKEN") : null,
      githubWritesAllowed: process.env.GAME_SHOP_ALLOW_GITHUB_WRITES === "true",
      externalIntegrationsAllowed: process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS === "true",
      paidGenerationAllowed: process.env.GAME_SHOP_ALLOW_PAID_GENERATION === "true",
    },
  };
}

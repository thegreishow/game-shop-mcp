export type GameProjectContext = {
  id: string;
  repo: string;
  defaultBranch: string;
  framework?: string;
  gamePath?: string;
  artStyle?: string;
  notes?: string;
};

function configuredProjects(): GameProjectContext[] {
  const raw = process.env.GAME_SHOP_PROJECTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is GameProjectContext =>
      Boolean(value && typeof value.id === "string" && typeof value.repo === "string" && typeof value.defaultBranch === "string"),
    );
  } catch {
    return [];
  }
}

export function listProjects() {
  return configuredProjects();
}

export function getProject(id: string) {
  const project = configuredProjects().find((candidate) => candidate.id === id);
  if (!project) throw new Error("Project is not configured in the Game Shop allowlist.");
  return project;
}

export function projectContext(id: string) {
  const project = getProject(id);
  return {
    ...project,
    execution: {
      githubReadConfigured: Boolean(process.env.GITHUB_TOKEN),
      githubWritesAllowed: process.env.GAME_SHOP_ALLOW_GITHUB_WRITES === "true",
    },
  };
}

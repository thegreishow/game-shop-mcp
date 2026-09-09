import { createBuildPlan, type BuildGoal } from "./planner.js";
import { getProject } from "./projects.js";

export function createProjectPlan(input: {
  projectId: string;
  goal: string;
  goals?: BuildGoal[];
  preference?: "quality" | "speed" | "cost" | "bundle" | "open-source" | "balanced";
}) {
  const project = getProject(input.projectId);
  const brief = [
    `Project: ${project.name ?? project.id}.`,
    `Repository: ${project.repo}.`,
    `Game path: ${project.gamePath ?? "not configured"}.`,
    project.artStyle ? `Art direction: ${project.artStyle}.` : "",
    project.notes ? `Project notes: ${project.notes}` : "",
    `Requested goal: ${input.goal}`,
    "Preserve unrelated files and constrain implementation to the registered game directory unless a human explicitly expands scope.",
  ].filter(Boolean).join(" ");

  const goals = input.goals?.length ? input.goals : (["premium", "performance"] satisfies BuildGoal[]);
  const plan = createBuildPlan({
    brief,
    product: "browser-game",
    goals,
    framework: "any",
    preference: input.preference ?? "quality",
  });

  return {
    project,
    requestedGoal: input.goal,
    plan,
    executionContract: {
      branchPrefix: "gameshop/",
      editRoot: project.gamePath ?? null,
      pullRequestBase: project.defaultBranch,
      verificationRequiredBeforePr: true,
      writesRequireOptIn: "GAME_SHOP_ALLOW_GITHUB_WRITES=true",
      paidGenerationIndependent: true,
    },
  };
}

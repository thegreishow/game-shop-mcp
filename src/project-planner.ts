import { createBuildPlan, type BuildGoal, type ProductKind } from "./planner.js";
import { getProject } from "./projects.js";

function asProductKind(value:string|undefined):ProductKind{
  const known:ProductKind[]=["website","web-app","browser-game","mobile-app","desktop-app","api-service","agent","automation","interactive-experience","digital-product","media-project","commerce","other"];
  return known.includes(value as ProductKind)?value as ProductKind:"other";
}

export function createProjectPlan(input: {
  projectId: string;
  goal: string;
  goals?: BuildGoal[];
  preference?: "quality" | "speed" | "cost" | "bundle" | "open-source" | "balanced";
}) {
  const project = getProject(input.projectId);
  const root=project.projectPath||project.gamePath;
  const product=asProductKind(project.productKind||project.framework);
  const brief = [
    `Project: ${project.name ?? project.id}.`,
    `Repository: ${project.repo}.`,
    `Product kind: ${product}.`,
    `Project path: ${root ?? "not configured"}.`,
    project.artStyle ? `Art direction: ${project.artStyle}.` : "",
    project.notes ? `Project notes: ${project.notes}` : "",
    `Requested goal: ${input.goal}`,
    "Preserve unrelated files and constrain implementation to the registered project directory unless a human explicitly expands scope.",
  ].filter(Boolean).join(" ");

  const goals = input.goals?.length ? input.goals : (["premium", "performance", "reliable"] satisfies BuildGoal[]);
  const plan = createBuildPlan({
    brief,
    product,
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
      editRoot: root ?? null,
      pullRequestBase: project.defaultBranch,
      verificationRequiredBeforePr: true,
      writesRequireOptIn: "GAME_SHOP_ALLOW_GITHUB_WRITES=true",
      paidGenerationIndependent: true,
      previewBeforeProduction: true,
      releaseGovernorRequired: true,
    },
  };
}

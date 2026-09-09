import { createHash, randomUUID } from "node:crypto";
import { createBuildPlan, type BuildPlanRequest } from "./planner.js";
import { integrationRegistry } from "./integrations.js";

export type ExecutionTarget = {
  repository?: string;
  branch?: string;
  project?: string;
  environment?: "development" | "preview" | "production";
};

export type ExecutionStepState = "pending" | "blocked" | "ready" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionRisk = "read" | "write" | "external" | "paid" | "deploy";

export type PrepareExecutionRequest = BuildPlanRequest & {
  target?: ExecutionTarget;
  allowWrites?: boolean;
  allowExternal?: boolean;
  allowDeploy?: boolean;
};

type PlannedStep = ReturnType<typeof createBuildPlan>["steps"][number];

function planHash(plan: ReturnType<typeof createBuildPlan>) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 16);
}

function risksFor(step: PlannedStep): ExecutionRisk[] {
  const risks: ExecutionRisk[] = ["write"];
  if (step.connect) risks.push("external");
  if (step.domain === "video" || step.domain === "agent-platform") risks.push("external");
  return [...new Set(risks)];
}

function integrationRequirements(step: PlannedStep) {
  if (!step.engine) return [];
  const integrations = integrationRegistry();
  return integrations
    .filter((i) => i.id === step.engine || i.capabilities.includes(step.capability) || i.capabilities.some((c) => step.capability.includes(c) || c.includes(step.capability)))
    .map((i) => ({ id: i.id, name: i.name, state: i.state, env: i.env ?? [], auth: i.auth, kinds: i.kinds }));
}

export function prepareExecution(request: PrepareExecutionRequest) {
  const { target, allowWrites = false, allowExternal = false, allowDeploy = false, ...planRequest } = request;
  const plan = createBuildPlan(planRequest);
  const digest = planHash(plan);
  const executionId = `gs_${digest}_${randomUUID().slice(0, 8)}`;
  const steps = plan.steps.map((step) => {
    const risks = risksFor(step);
    const integrations = integrationRequirements(step);
    const missingSecrets = [...new Set(integrations.flatMap((i) => i.env).filter((env) => !process.env[env]))];
    const blockers: string[] = [];
    if (!target?.repository) blockers.push("target-repository-required");
    if (risks.includes("write") && !allowWrites) blockers.push("write-approval-required");
    if (risks.includes("external") && !allowExternal) blockers.push("external-action-approval-required");
    if (risks.includes("deploy") && !allowDeploy) blockers.push("deploy-approval-required");
    if (missingSecrets.length) blockers.push("missing-secrets");
    if (!step.engine) blockers.push("no-verified-engine");
    return {
      ...step,
      risks,
      integrations,
      missingSecrets,
      blockers,
      state: blockers.length ? "blocked" as const : "ready" as const,
    };
  });
  const requiredSecrets = [...new Set(steps.flatMap((s) => s.missingSecrets))];
  const approvals = {
    writes: steps.some((s) => s.risks.includes("write")) && !allowWrites,
    externalActions: steps.some((s) => s.risks.includes("external")) && !allowExternal,
    deployment: steps.some((s) => s.risks.includes("deploy")) && !allowDeploy,
    paidGeneration: "Paid generation remains independently controlled by GAME_SHOP_ALLOW_PAID_GENERATION and is never enabled by this manifest.",
  };
  return {
    schemaVersion: "1.0",
    executionId,
    planDigest: digest,
    createdAt: new Date().toISOString(),
    status: steps.every((s) => s.state === "ready") ? "ready" : "blocked",
    target: target ?? null,
    approvals,
    requiredSecrets,
    plan,
    steps,
    executionPolicy: {
      mode: "prepare-only",
      mutation: "This manifest performs no repository, provider, billing, or deployment mutation.",
      idempotency: "Use executionId/planDigest when an execution store and workers are introduced.",
      persistence: "The caller must persist this manifest until Game Shop gains a durable task store.",
    },
  };
}

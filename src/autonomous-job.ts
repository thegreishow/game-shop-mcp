import { randomUUID } from "node:crypto";
import { getProject } from "./projects.js";
import { logEvent, listEvents, setExecutionBudget, budgetStatus } from "./governance-ledger.js";
import { githubCreateProjectBranch, githubCreateProjectPullRequest, githubVerifyProjectBranch } from "./github-execution.js";
import { runQa, type QaFinding } from "./qa-worker.js";
import type { BrowserAssertion, BrowserQaProvider } from "./browser-adapters.js";
import type { VerificationCheck } from "./verification.js";
import { recordProviderExecutionFeedback } from "./provider-performance.js";

export type AutonomyLevel = "observe" | "plan" | "execute" | "repair" | "ship";
export type AutonomousJobStage =
  | "created"
  | "planning"
  | "executing"
  | "building"
  | "previewing"
  | "judging"
  | "repairing"
  | "shipping"
  | "completed"
  | "blocked"
  | "failed"
  | "cancelled";
export type AutonomousFailureKind =
  | "build-failure"
  | "runtime-exception"
  | "broken-asset"
  | "layout-issue"
  | "interaction-failure"
  | "bad-route"
  | "network-api-failure"
  | "deployment-failure"
  | "unknown";
export type AutonomousOutcome = "success" | "failed" | "cancelled";

export type AutonomousJobArtifact = {
  artifactId: string;
  kind: string;
  name?: string;
  path?: string;
  url?: string;
  provider?: string;
  accepted?: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
export type AutonomousJobEvidence = {
  evidenceId: string;
  kind: string;
  source: string;
  status: "passed" | "failed" | "blocked" | "info";
  summary: string;
  createdAt: string;
  data?: Record<string, unknown>;
};
export type AutonomousJobFailure = {
  failureId: string;
  kind: AutonomousFailureKind;
  message: string;
  stage: AutonomousJobStage;
  createdAt: string;
  evidenceIds: string[];
};
export type AutonomousRepairAttempt = {
  attempt: number;
  classification: AutonomousFailureKind;
  status: "requested" | "applied" | "failed";
  startedAt: string;
  completedAt?: string;
  commitSha?: string;
  summary?: string;
  evidenceIds: string[];
};
export type AutonomousJob = {
  schemaVersion: "1.0";
  executionId: string;
  goal: string;
  projectId: string;
  repository: string;
  projectRoot?: string;
  branch: string;
  baseRef: string;
  autonomy: AutonomyLevel;
  constraints: string[];
  budget: {
    authorizedUsd: number | null;
    providerBudgets: Record<string, number>;
    maxRepairAttempts: number;
  };
  stage: AutonomousJobStage;
  createdAt: string;
  updatedAt: string;
  commitSha?: string;
  previewUrl?: string;
  pullRequest?: { number: number | null; url: string | null };
  artifacts: AutonomousJobArtifact[];
  evidence: AutonomousJobEvidence[];
  failures: AutonomousJobFailure[];
  repairAttempts: AutonomousRepairAttempt[];
  outcome?: {
    status: AutonomousOutcome;
    summary: string;
    completedAt: string;
  };
};

const jobs = new Map<string, AutonomousJob>();
const levelRank: Record<AutonomyLevel, number> = { observe: 0, plan: 1, execute: 2, repair: 3, ship: 4 };

function now() { return new Date().toISOString(); }
function hasLevel(level: AutonomyLevel, required: AutonomyLevel) { return levelRank[level] >= levelRank[required]; }
function clampRepairAttempts(value?: number) { return Math.max(1, Math.min(5, value ?? 3)); }
function safeBranch(executionId: string) { return `gameshop/job-${executionId.replace(/^gs_/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(-32)}`; }
function eventData(event: Record<string, unknown>) { return event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : {}; }
function asJob(value: unknown): AutonomousJob | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Partial<AutonomousJob>;
  return job.schemaVersion === "1.0" && typeof job.executionId === "string" && typeof job.goal === "string" ? job as AutonomousJob : null;
}

async function persistJob(job: AutonomousJob, type: string, extra: Record<string, unknown> = {}) {
  job.updatedAt = now();
  jobs.set(job.executionId, job);
  await logEvent({
    type,
    executionId: job.executionId,
    projectId: job.projectId,
    data: { job, ...extra },
  }).catch(() => null);
  return job;
}

export function autonomyPolicy(level: AutonomyLevel) {
  return {
    level,
    mayInspect: true,
    mayPlan: hasLevel(level, "plan"),
    mayWriteControlledBranch: hasLevel(level, "execute"),
    mayCreatePreview: hasLevel(level, "execute"),
    mayRepair: hasLevel(level, "repair"),
    mayOpenPullRequest: hasLevel(level, "ship"),
    mayMergePullRequest: false,
    gates: {
      githubWrites: "GAME_SHOP_ALLOW_GITHUB_WRITES=true",
      externalIntegrations: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true",
      paidGeneration: "GAME_SHOP_ALLOW_PAID_GENERATION=true",
    },
    invariant: "Autonomy never bypasses spend, external-integration, repository-write, or human merge gates.",
  } as const;
}

export function autonomousJobGraph(level: AutonomyLevel) {
  const policy = autonomyPolicy(level);
  return {
    level,
    path: ["created", "planning", "executing", "building", "previewing", "judging", "repairing", "shipping", "completed"],
    browserAuthority: "Playwright is the terminal judge for web/game jobs. A code-only or structural pass is not sufficient.",
    repairLoop: { enabled: policy.mayRepair, maxAttempts: "1-5, job bounded", exitOn: ["browser-pass", "repair-budget-exhausted", "hard-blocker"] },
    shipping: { openPullRequest: policy.mayOpenPullRequest, merge: false },
  };
}

export function autonomousJobInfo() {
  return {
    protocol: "canonical-autonomous-job-v1",
    schemaVersion: "1.0",
    requiredState: ["executionId", "goal", "project/repository", "constraints", "budget", "stage", "artifacts", "evidence", "failures", "repairAttempts", "outcome"],
    autonomyLevels: ["observe", "plan", "execute", "repair", "ship"],
    browserJudge: "playwright-mcp for live local/Codex loops; deterministic Playwright CI is the independent release lane",
    persistence: "event-sourced snapshots in game_shop_events when Supabase is configured; process-memory fallback otherwise",
    shippingRule: "ship may open a verified pull request; it never merges it",
  } as const;
}

export async function createAutonomousJob(input: {
  goal: string;
  projectId: string;
  autonomy?: AutonomyLevel;
  constraints?: string[];
  budgetUsd?: number;
  providerBudgets?: Record<string, number>;
  maxRepairAttempts?: number;
  baseRef?: string;
  branch?: string;
}) {
  const project = getProject(input.projectId);
  const executionId = `gs_job_${randomUUID()}`;
  const autonomy = input.autonomy ?? "plan";
  const job: AutonomousJob = {
    schemaVersion: "1.0",
    executionId,
    goal: input.goal.trim(),
    projectId: project.id,
    repository: project.repo,
    projectRoot: project.projectPath || project.gamePath,
    branch: input.branch ?? safeBranch(executionId),
    baseRef: input.baseRef ?? project.defaultBranch,
    autonomy,
    constraints: input.constraints ?? [],
    budget: {
      authorizedUsd: input.budgetUsd ?? null,
      providerBudgets: input.providerBudgets ?? {},
      maxRepairAttempts: clampRepairAttempts(input.maxRepairAttempts),
    },
    stage: autonomy === "observe" ? "created" : "planning",
    createdAt: now(),
    updatedAt: now(),
    artifacts: [],
    evidence: [],
    failures: [],
    repairAttempts: [],
  };
  if (typeof input.budgetUsd === "number") {
    await setExecutionBudget({ executionId, budgetUsd: input.budgetUsd, providerBudgets: input.providerBudgets });
  }
  return persistJob(job, "job.created", { policy: autonomyPolicy(autonomy), graph: autonomousJobGraph(autonomy) });
}

export async function resolveAutonomousJob(executionId: string) {
  const warm = jobs.get(executionId);
  if (warm) return warm;
  const events = await listEvents({ executionId, limit: 100 });
  for (const event of events as Array<Record<string, unknown>>) {
    const job = asJob(eventData(event).job);
    if (job) { jobs.set(executionId, job); return job; }
  }
  return null;
}

export async function listAutonomousJobs(limit = 50) {
  const events = await listEvents({ limit: Math.min(300, Math.max(50, limit * 5)) });
  const found = new Map<string, AutonomousJob>();
  for (const event of events as Array<Record<string, unknown>>) {
    const job = asJob(eventData(event).job);
    if (job && !found.has(job.executionId)) found.set(job.executionId, job);
  }
  for (const job of jobs.values()) if (!found.has(job.executionId)) found.set(job.executionId, job);
  return [...found.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export async function autonomousJobStatus(executionId: string) {
  const job = await resolveAutonomousJob(executionId);
  if (!job) return null;
  const spend = await budgetStatus(executionId).catch(() => null);
  return { job, policy: autonomyPolicy(job.autonomy), graph: autonomousJobGraph(job.autonomy), spend };
}

export async function prepareAutonomousJobBranch(executionId: string) {
  const job = await resolveAutonomousJob(executionId);
  if (!job) throw new Error("Autonomous job not found.");
  if (!hasLevel(job.autonomy, "execute")) return { status: "blocked", reason: "autonomy-level-does-not-allow-writes", job };
  try {
    await githubCreateProjectBranch({ projectId: job.projectId, branch: job.branch, fromRef: job.baseRef });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/422|already exists|reference already exists/i.test(message)) throw error;
  }
  job.stage = "executing";
  const evidence: AutonomousJobEvidence = { evidenceId: `ev_${randomUUID()}`, kind: "repository", source: "github", status: "passed", summary: `Controlled branch ready: ${job.branch}`, createdAt: now() };
  job.evidence.push(evidence);
  await persistJob(job, "job.branch.ready", { branch: job.branch });
  return { status: "ready", branch: job.branch, job };
}

export async function recordAutonomousJobChange(input: { executionId: string; commitSha: string; summary?: string; artifacts?: Omit<AutonomousJobArtifact, "artifactId" | "createdAt">[] }) {
  const job = await resolveAutonomousJob(input.executionId);
  if (!job) throw new Error("Autonomous job not found.");
  job.commitSha = input.commitSha;
  job.stage = "previewing";
  for (const artifact of input.artifacts ?? []) job.artifacts.push({ ...artifact, artifactId: `art_${randomUUID()}`, createdAt: now() });
  job.evidence.push({ evidenceId: `ev_${randomUUID()}`, kind: "change", source: "codex-or-repair-engine", status: "info", summary: input.summary ?? `Change recorded at ${input.commitSha}`, createdAt: now(), data: { commitSha: input.commitSha } });
  await persistJob(job, "job.change.recorded", { commitSha: input.commitSha });
  return job;
}

export function classifyQaFailure(findings: QaFinding[]): AutonomousFailureKind {
  const text = findings.map((f) => `${f.kind} ${f.message} ${JSON.stringify(f.evidence ?? {})}`).join(" ").toLowerCase();
  if (findings.some((f) => f.kind === "deployment")) return "deployment-failure";
  if (/404|asset|image|audio|font|script|stylesheet/.test(text) && findings.some((f) => f.kind === "network")) return "broken-asset";
  if (findings.some((f) => f.kind === "console")) return "runtime-exception";
  if (findings.some((f) => f.kind === "network")) return "network-api-failure";
  if (findings.some((f) => f.kind === "visual")) return "layout-issue";
  if (findings.some((f) => f.kind === "interaction")) return "interaction-failure";
  if (/route|path|not found|404/.test(text)) return "bad-route";
  if (findings.some((f) => f.kind === "structural")) return "build-failure";
  return "unknown";
}

function repairPacket(job: AutonomousJob, failure: AutonomousJobFailure, attempt: AutonomousRepairAttempt) {
  return {
    executionId: job.executionId,
    projectId: job.projectId,
    repository: job.repository,
    projectRoot: job.projectRoot ?? null,
    branch: job.branch,
    goal: job.goal,
    classification: failure.kind,
    failure: failure.message,
    constraints: job.constraints,
    attempt: attempt.attempt,
    maxAttempts: job.budget.maxRepairAttempts,
    evidence: job.evidence.filter((e) => failure.evidenceIds.includes(e.evidenceId)),
    instruction: "Make the smallest safe project-scoped patch that addresses the evidence. Do not write to the default branch and do not merge a PR. After applying the patch, record the repair result and run the browser judge again.",
    patchTool: "gameshop_apply_patch",
    nextTools: ["gameshop_autonomous_job_repair_result", "gameshop_autonomous_job_judge"],
  };
}

export async function judgeAutonomousJob(input: {
  executionId: string;
  url?: string;
  provider?: BrowserQaProvider;
  checks?: VerificationCheck[];
  interactions?: string[];
  assertions?: BrowserAssertion[];
  autoPreview?: boolean;
}) {
  const job = await resolveAutonomousJob(input.executionId);
  if (!job) throw new Error("Autonomous job not found.");
  if (!hasLevel(job.autonomy, "plan")) return { status: "blocked", reason: "observe-level-does-not-run-external-browser-qa", job };
  job.stage = "judging";
  await persistJob(job, "job.judge.started", { url: input.url ?? null });
  const started = Date.now();
  const qa = await runQa({
    projectId: job.projectId,
    ref: job.branch,
    url: input.url,
    provider: input.provider ?? "playwright-mcp",
    checks: input.checks,
    interactions: input.interactions,
    assertions: input.assertions,
    autoPreview: input.autoPreview ?? hasLevel(job.autonomy, "execute"),
    executionId: job.executionId,
    commitSha: job.commitSha,
  });
  const latencyMs = Date.now() - started;
  if (qa.url) job.previewUrl = qa.url;
  const evidence: AutonomousJobEvidence = {
    evidenceId: `ev_${randomUUID()}`,
    kind: "browser-judgement",
    source: qa.provider,
    status: qa.status === "passed" ? "passed" : qa.status === "failed" ? "failed" : "blocked",
    summary: qa.status === "passed" ? "Playwright browser judgement passed." : `Playwright browser judgement ${qa.status}.`,
    createdAt: now(),
    data: { url: qa.url, findings: qa.findings, structural: qa.structural, browser: qa.browser, deployment: qa.deployment },
  };
  job.evidence.push(evidence);
  const passed = qa.status === "passed";
  await recordProviderExecutionFeedback({
    provider: qa.provider,
    executionId: job.executionId,
    projectId: job.projectId,
    capability: "browser-qa",
    outcome: passed ? "success" : "failure",
    latencyMs,
    retries: job.repairAttempts.length,
    qaStatus: qa.status,
    artifactAccepted: passed,
    actualCostUsd: 0,
    data: { browserAuthority: true, findings: qa.findings.length },
  }).catch(() => null);

  if (passed) {
    job.stage = hasLevel(job.autonomy, "ship") ? "shipping" : "completed";
    if (!hasLevel(job.autonomy, "ship")) job.outcome = { status: "success", summary: "Browser-authoritative QA passed.", completedAt: now() };
    await persistJob(job, "job.judge.passed", { evidenceId: evidence.evidenceId, qaStatus: qa.status });
    return { status: "passed", job, qa, next: hasLevel(job.autonomy, "ship") ? "gameshop_autonomous_job_ship" : null };
  }

  const classification = classifyQaFailure(qa.findings);
  const failure: AutonomousJobFailure = { failureId: `fail_${randomUUID()}`, kind: classification, message: qa.findings.find((f) => f.severity === "error")?.message ?? `QA ${qa.status}`, stage: "judging", createdAt: now(), evidenceIds: [evidence.evidenceId] };
  job.failures.push(failure);
  const pendingRepair = [...job.repairAttempts].reverse().find((attempt) => attempt.status === "requested");
  if (hasLevel(job.autonomy, "repair") && job.repairAttempts.length < job.budget.maxRepairAttempts && !pendingRepair) {
    const attempt: AutonomousRepairAttempt = { attempt: job.repairAttempts.length + 1, classification, status: "requested", startedAt: now(), evidenceIds: [evidence.evidenceId] };
    job.repairAttempts.push(attempt);
    job.stage = "repairing";
    await persistJob(job, "job.repair.requested", { failureId: failure.failureId, attempt: attempt.attempt });
    return { status: "repair_required", job, qa, repair: repairPacket(job, failure, attempt) };
  }
  job.stage = qa.status === "blocked" ? "blocked" : "failed";
  job.outcome = { status: "failed", summary: hasLevel(job.autonomy, "repair") ? "Repair budget exhausted or repair is already pending." : "QA failed and autonomy level does not permit repair.", completedAt: now() };
  await persistJob(job, "job.judge.failed", { failureId: failure.failureId, repairBudgetExhausted: job.repairAttempts.length >= job.budget.maxRepairAttempts });
  return { status: job.stage, job, qa };
}

export async function recordAutonomousRepairResult(input: { executionId: string; status: "applied" | "failed"; commitSha?: string; summary?: string }) {
  const job = await resolveAutonomousJob(input.executionId);
  if (!job) throw new Error("Autonomous job not found.");
  const attempt = [...job.repairAttempts].reverse().find((item) => item.status === "requested");
  if (!attempt) throw new Error("No pending repair attempt exists.");
  attempt.status = input.status;
  attempt.completedAt = now();
  attempt.commitSha = input.commitSha;
  attempt.summary = input.summary;
  if (input.commitSha) job.commitSha = input.commitSha;
  job.stage = input.status === "applied" ? "previewing" : (job.repairAttempts.length >= job.budget.maxRepairAttempts ? "failed" : "repairing");
  if (job.stage === "failed") job.outcome = { status: "failed", summary: "Repair attempts exhausted before browser QA passed.", completedAt: now() };
  await persistJob(job, input.status === "applied" ? "job.repair.applied" : "job.repair.failed", { attempt: attempt.attempt, commitSha: input.commitSha ?? null });
  return job;
}

export async function attachAutonomousJobArtifact(input: { executionId: string; kind: string; name?: string; path?: string; url?: string; provider?: string; accepted?: boolean; metadata?: Record<string, unknown> }) {
  const job = await resolveAutonomousJob(input.executionId);
  if (!job) throw new Error("Autonomous job not found.");
  const artifact: AutonomousJobArtifact = { artifactId: `art_${randomUUID()}`, kind: input.kind, name: input.name, path: input.path, url: input.url, provider: input.provider, accepted: input.accepted, metadata: input.metadata, createdAt: now() };
  job.artifacts.push(artifact);
  await persistJob(job, "job.artifact.attached", { artifactId: artifact.artifactId });
  return artifact;
}

export async function shipAutonomousJob(executionId: string) {
  const job = await resolveAutonomousJob(executionId);
  if (!job) throw new Error("Autonomous job not found.");
  if (!hasLevel(job.autonomy, "ship")) return { status: "blocked", reason: "ship-autonomy-required", job };
  if (job.stage !== "shipping") throw new Error("Browser-authoritative QA must pass before shipping.");
  const verification = await githubVerifyProjectBranch({ projectId: job.projectId, branch: job.branch });
  if (!verification.passed) throw new Error("GitHub project-scope verification failed; shipping is blocked.");
  const pr = await githubCreateProjectPullRequest({ projectId: job.projectId, branch: job.branch, title: `Game Shop: ${job.goal.slice(0, 180)}`, body: `Autonomous Game Shop execution ${job.executionId}.\n\nBrowser-authoritative QA passed before this PR was opened.\n\nMerge remains human-controlled.` });
  job.pullRequest = { number: typeof pr.number === "number" ? pr.number : null, url: typeof pr.url === "string" ? pr.url : null };
  job.stage = "completed";
  job.outcome = { status: "success", summary: "Browser QA passed and a verified pull request was opened. Merge remains human-controlled.", completedAt: now() };
  await persistJob(job, "job.shipped", { pullRequest: job.pullRequest });
  return { status: "completed", job, verification, pullRequest: pr };
}

export async function cancelAutonomousJob(executionId: string) {
  const job = await resolveAutonomousJob(executionId);
  if (!job) return null;
  job.stage = "cancelled";
  job.outcome = { status: "cancelled", summary: "Cancelled by caller.", completedAt: now() };
  return persistJob(job, "job.cancelled");
}

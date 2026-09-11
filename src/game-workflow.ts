import path from "node:path";
import { getProject, type ProjectContext } from "./projects.js";

export type GameWorkflowStage = "inspect" | "plan" | "patch" | "validate" | "playtest" | "evidence" | "commit";

export type GameWorkflowCheckEvidence = {
  ok: boolean;
  label: string;
  exactSha: string;
  exactTree?: string;
  details?: unknown;
};

export type GameWorkflowEvidence = {
  kind: "validation" | "playtest" | "diff" | "artifact";
  label: string;
  value: unknown;
};

export type GameWorkflowState = {
  projectId: string;
  project: ProjectContext;
  stage: GameWorkflowStage;
  allowedRoots: string[];
  changedFiles: string[];
  diffPreview?: string;
  evidence: GameWorkflowEvidence[];
  validation?: GameWorkflowCheckEvidence;
  playtest?: GameWorkflowCheckEvidence;
};

const ORDER: GameWorkflowStage[] = ["inspect", "plan", "patch", "validate", "playtest", "evidence", "commit"];

function normalizeRepoPath(value: string) {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/")).replace(/^\.\//, "");
  if (normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new Error(`Path escapes repository root: ${value}`);
  }
  return normalized;
}

function assertExactRevision(label: string, evidence: GameWorkflowCheckEvidence) {
  if (!evidence.label.trim()) throw new Error(`${label} evidence requires a label.`);
  if (!evidence.exactSha.trim()) throw new Error(`${label} evidence requires an exact tested SHA.`);
  if (!evidence.ok) throw new Error(`${label} evidence is not green.`);
}

export function workflowAllowedRoots(project: ProjectContext) {
  const roots = [project.projectPath, project.gamePath, ...(project.verifyPaths ?? [])]
    .filter((value): value is string => Boolean(value))
    .map(normalizeRepoPath);
  return [...new Set(roots)];
}

export function assertWorkflowPathAllowed(state: GameWorkflowState, candidate: string) {
  const normalized = normalizeRepoPath(candidate);
  const allowed = state.allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
  if (!allowed) throw new Error(`Workflow path is outside project allowlist: ${candidate}`);
  return normalized;
}

export function createGameWorkflow(projectId: string): GameWorkflowState {
  const project = getProject(projectId);
  const allowedRoots = workflowAllowedRoots(project);
  if (!allowedRoots.length) throw new Error(`Project ${projectId} has no controlled file roots.`);
  return { projectId, project, stage: "inspect", allowedRoots, changedFiles: [], evidence: [] };
}

export function advanceGameWorkflow(state: GameWorkflowState, next: GameWorkflowStage): GameWorkflowState {
  const currentIndex = ORDER.indexOf(state.stage);
  const nextIndex = ORDER.indexOf(next);
  if (nextIndex !== currentIndex + 1) throw new Error(`Invalid workflow transition: ${state.stage} -> ${next}`);
  if (next === "commit") {
    if (!state.diffPreview) throw new Error("Commit requires a diff preview.");
    if (!state.changedFiles.length) throw new Error("Commit requires at least one changed file.");
    if (!state.validation) throw new Error("Commit requires validation evidence.");
    if (!state.playtest) throw new Error("Commit requires playtest evidence.");
    assertExactRevision("Validation", state.validation);
    assertExactRevision("Playtest", state.playtest);
    if (state.validation.exactSha !== state.playtest.exactSha) {
      throw new Error("Validation and playtest evidence must reference the same exact SHA.");
    }
    if (state.validation.exactTree && state.playtest.exactTree && state.validation.exactTree !== state.playtest.exactTree) {
      throw new Error("Validation and playtest evidence must reference the same exact tree.");
    }
    if (!state.evidence.some((item) => item.kind === "artifact")) throw new Error("Commit requires attached artifact evidence.");
  }
  return { ...state, stage: next };
}

export function attachPatchPreview(state: GameWorkflowState, changedFiles: string[], diffPreview: string): GameWorkflowState {
  if (state.stage !== "patch") throw new Error("Patch preview can only be attached during patch stage.");
  if (!changedFiles.length) throw new Error("Patch stage requires at least one changed file.");
  const safeFiles = [...new Set(changedFiles.map((file) => assertWorkflowPathAllowed(state, file)))];
  if (!diffPreview.trim()) throw new Error("Patch stage requires a non-empty diff preview.");
  return { ...state, changedFiles: safeFiles, diffPreview, evidence: [...state.evidence, { kind: "diff", label: "patch-preview", value: diffPreview }] };
}

export function markValidated(state: GameWorkflowState, value: GameWorkflowCheckEvidence): GameWorkflowState {
  if (state.stage !== "validate") throw new Error("Validation can only be recorded during validate stage.");
  assertExactRevision("Validation", value);
  return { ...state, validation: value, evidence: [...state.evidence, { kind: "validation", label: value.label, value }] };
}

export function markPlaytested(state: GameWorkflowState, value: GameWorkflowCheckEvidence): GameWorkflowState {
  if (state.stage !== "playtest") throw new Error("Playtest can only be recorded during playtest stage.");
  assertExactRevision("Playtest", value);
  return { ...state, playtest: value, evidence: [...state.evidence, { kind: "playtest", label: value.label, value }] };
}

export function attachEvidence(state: GameWorkflowState, label: string, value: unknown): GameWorkflowState {
  if (state.stage !== "evidence") throw new Error("Additional evidence can only be attached during evidence stage.");
  if (!label.trim()) throw new Error("Artifact evidence requires a label.");
  return { ...state, evidence: [...state.evidence, { kind: "artifact", label, value }] };
}

export function commitGate(state: GameWorkflowState) {
  if (state.stage !== "commit") throw new Error("Workflow has not reached commit stage.");
  const revision = state.validation?.exactSha;
  return Object.freeze({
    projectId: state.projectId,
    repo: state.project.repo,
    branch: state.project.defaultBranch,
    allowedRoots: [...state.allowedRoots],
    changedFiles: [...state.changedFiles],
    diffPreview: state.diffPreview,
    validation: state.validation,
    playtest: state.playtest,
    evidence: [...state.evidence],
    exactSha: revision,
    exactTree: state.validation?.exactTree ?? state.playtest?.exactTree,
    ready: Boolean(state.diffPreview && state.changedFiles.length && state.validation?.ok && state.playtest?.ok),
  });
}

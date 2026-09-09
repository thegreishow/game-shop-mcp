import { prepareExecution, type PrepareExecutionRequest } from "./execution.js";
import { githubReadProjectFile, githubUpsertProjectFile } from "./github-execution.js";

export type FileMutation = {
  path: string;
  content: string;
  message: string;
  sha?: string;
};

export type ExecuteGitHubRequest = PrepareExecutionRequest & {
  projectId: string;
  operations: FileMutation[];
  dryRun?: boolean;
};

export async function executeGitHubPlan(request: ExecuteGitHubRequest) {
  const { projectId, operations, dryRun = true, ...prepareRequest } = request;
  if (!operations.length) throw new Error("At least one file operation is required.");
  if (operations.length > 25) throw new Error("Execution is limited to 25 file operations per run.");

  const manifest = prepareExecution({ ...prepareRequest, allowWrites: !dryRun && prepareRequest.allowWrites === true });
  const targetProject = manifest.target?.project;
  if (targetProject && targetProject !== projectId) throw new Error("Execution project does not match the prepared target.");

  const results: Array<Record<string, unknown>> = [];
  for (const operation of operations) {
    let current: Awaited<ReturnType<typeof githubReadProjectFile>> | null = null;
    try { current = await githubReadProjectFile({ projectId, path: operation.path, ref: manifest.target?.branch }); } catch { current = null; }
    if (dryRun) {
      results.push({ path: operation.path, action: current ? "update" : "create", currentSha: current?.sha ?? null, status: "planned" });
      continue;
    }
    if (!prepareRequest.allowWrites) throw new Error("Execution requires explicit write approval.");
    const result = await githubUpsertProjectFile({
      projectId,
      path: operation.path,
      content: operation.content,
      message: operation.message,
      branch: manifest.target?.branch,
      sha: operation.sha ?? (typeof current?.sha === "string" ? current.sha : undefined),
    });
    results.push({ ...result, action: current ? "update" : "create", status: "completed" });
  }

  return {
    executionId: manifest.executionId,
    planDigest: manifest.planDigest,
    mode: dryRun ? "dry-run" : "execute",
    status: dryRun ? "planned" : "completed",
    projectId,
    operations: results,
    manifest,
  };
}

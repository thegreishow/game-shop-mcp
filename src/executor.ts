import { prepareExecution, type PrepareExecutionRequest } from "./execution.js";
import { githubReadProjectFile, githubUpsertProjectFile } from "./github-execution.js";
import { getExecution, saveExecution, updateExecution } from "./execution-store.js";

export type FileMutation = { path: string; content: string; message: string; sha?: string };
export type ExecuteGitHubRequest = PrepareExecutionRequest & { projectId: string; operations: FileMutation[]; dryRun?: boolean; executionId?: string };

export async function executeGitHubPlan(request: ExecuteGitHubRequest) {
  const { projectId, operations, dryRun = true, executionId, ...prepareRequest } = request;
  if (!operations.length) throw new Error("At least one file operation is required.");
  if (operations.length > 25) throw new Error("Execution is limited to 25 file operations per run.");

  const manifest = prepareExecution({ ...prepareRequest, allowWrites: !dryRun && prepareRequest.allowWrites === true });
  const id = executionId || manifest.executionId;
  const targetProject = manifest.target?.project;
  if (targetProject && targetProject !== projectId) throw new Error("Execution project does not match the prepared target.");
  const branch = manifest.target?.branch;
  if (!dryRun && !branch) throw new Error("Real execution requires an explicit gameshop/ target branch.");
  if (branch && !branch.startsWith("gameshop/")) throw new Error("Execution target branch must start with gameshop/.");

  const existing = getExecution(id);
  const startIndex = existing?.completedOperations ?? 0;
  if (existing?.status === "cancelled") throw new Error("Execution is cancelled.");
  if (startIndex > operations.length) throw new Error("Stored execution state does not match the supplied operation list.");

  const now = new Date().toISOString();
  saveExecution(existing ?? { executionId:id, planDigest:manifest.planDigest, projectId, mode:dryRun?"dry-run":"execute", status:"planned", createdAt:now, updatedAt:now, completedOperations:0, totalOperations:operations.length, operationResults:[] });
  updateExecution(id, { status:"running", totalOperations:operations.length });
  const results = [...(existing?.operationResults ?? [])];

  try {
    for (let index = startIndex; index < operations.length; index++) {
      const operation = operations[index];
      let current: Awaited<ReturnType<typeof githubReadProjectFile>> | null = null;
      try { current = await githubReadProjectFile({ projectId, path: operation.path, ref: branch }); } catch { current = null; }
      if (dryRun) {
        results.push({ index, path: operation.path, action: current ? "update" : "create", currentSha: current?.sha ?? null, status: "planned" });
      } else {
        if (!prepareRequest.allowWrites) throw new Error("Execution requires explicit write approval.");
        const result = await githubUpsertProjectFile({ projectId, path: operation.path, content: operation.content, message: operation.message, branch: branch!, sha: operation.sha ?? (typeof current?.sha === "string" ? current.sha : undefined) });
        results.push({ index, ...result, action: current ? "update" : "create", status: "completed" });
      }
      updateExecution(id, { completedOperations:index+1, operationResults:results });
    }
    const final = updateExecution(id, { status:"completed", operationResults:results });
    return { executionId:id, planDigest:manifest.planDigest, mode:dryRun?"dry-run":"execute", status:"completed", resumedFromOperation:startIndex, projectId, operations:results, execution:final, manifest };
  } catch (error) {
    updateExecution(id, { status:"failed", lastError:error instanceof Error?error.message:"Execution failed.", operationResults:results });
    throw error;
  }
}

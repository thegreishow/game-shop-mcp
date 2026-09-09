import { getProject } from "./projects.js";
import { githubWritesAllowed } from "./security.js";

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GitHub execution is not configured.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "game-shop-mcp",
  };
}

async function githubJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}).`);
  return body;
}

function safePath(path: string) {
  const normalized = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized.includes("..")) throw new Error("Invalid repository path.");
  return normalized;
}

function projectPath(projectId: string, relativePath = "") {
  const project = getProject(projectId);
  if (!project.gamePath) throw new Error("Project does not define a gamePath.");
  const root = safePath(project.gamePath);
  const relative = relativePath ? safePath(relativePath) : "";
  const path = relative ? `${root}/${relative}` : root;
  if (path !== root && !path.startsWith(`${root}/`)) throw new Error("Path escapes the registered game directory.");
  return { project, root, path };
}

function requireWrites() {
  if (!githubWritesAllowed()) throw new Error("GitHub writes are disabled. Set GAME_SHOP_ALLOW_GITHUB_WRITES=true to opt in.");
}

export async function githubInspectProject(input: { projectId: string; ref?: string }) {
  const { project, root, path } = projectPath(input.projectId);
  const ref = input.ref || project.defaultBranch;
  const url = `https://api.github.com/repos/${project.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const data = await githubJson(url, { headers: githubHeaders() });
  if (!Array.isArray(data)) throw new Error("Project root is not a readable directory.");
  const entries = data.map((item) => {
    const value = item as Record<string, unknown>;
    return { name: value.name, path: value.path, type: value.type, size: value.size, sha: value.sha };
  });
  return { projectId: project.id, name: project.name, repo: project.repo, ref, root, framework: project.framework, artStyle: project.artStyle, notes: project.notes, entries };
}

export async function githubReadProjectFile(input: { projectId: string; path: string; ref?: string }) {
  const { project, path } = projectPath(input.projectId, input.path);
  const ref = input.ref || project.defaultBranch;
  const url = `https://api.github.com/repos/${project.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const data = await githubJson(url, { headers: githubHeaders() }) as Record<string, unknown>;
  if (data.type !== "file" || typeof data.content !== "string") throw new Error("Requested path is not a readable file.");
  const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { projectId: project.id, repo: project.repo, ref, path, sha: data.sha, content };
}

export async function githubCreateProjectBranch(input: { projectId: string; branch: string; fromRef?: string }) {
  requireWrites();
  const project = getProject(input.projectId);
  if (!/^gameshop\/[a-z0-9._/-]+$/i.test(input.branch)) throw new Error("Game Shop branches must start with gameshop/.");
  const fromRef = input.fromRef || project.defaultBranch;
  const base = await githubJson(`https://api.github.com/repos/${project.repo}/git/ref/heads/${encodeURIComponent(fromRef)}`, { headers: githubHeaders() }) as Record<string, unknown>;
  const object = base.object as Record<string, unknown> | undefined;
  const sha = typeof object?.sha === "string" ? object.sha : null;
  if (!sha) throw new Error("Could not resolve base branch SHA.");
  await githubJson(`https://api.github.com/repos/${project.repo}/git/refs`, { method: "POST", headers: { ...githubHeaders(), "content-type": "application/json" }, body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha }) });
  return { projectId: project.id, repo: project.repo, branch: input.branch, base: fromRef, baseSha: sha };
}

export async function githubUpsertProjectFile(input: { projectId: string; path: string; content: string; message: string; branch: string; sha?: string }) {
  requireWrites();
  const { project, path } = projectPath(input.projectId, input.path);
  if (!input.branch.startsWith("gameshop/")) throw new Error("Controlled edits require a gameshop/ branch.");
  const payload: Record<string, unknown> = { message: input.message, content: Buffer.from(input.content, "utf8").toString("base64"), branch: input.branch };
  if (input.sha) payload.sha = input.sha;
  const url = `https://api.github.com/repos/${project.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const data = await githubJson(url, { method: "PUT", headers: { ...githubHeaders(), "content-type": "application/json" }, body: JSON.stringify(payload) }) as Record<string, unknown>;
  const commit = data.commit as Record<string, unknown> | undefined;
  return { projectId: project.id, repo: project.repo, branch: input.branch, path, commitSha: commit?.sha ?? null };
}

export async function githubVerifyProjectBranch(input: { projectId: string; branch: string }) {
  const project = getProject(input.projectId);
  if (!project.gamePath) throw new Error("Project does not define a gamePath.");
  const compare = await githubJson(`https://api.github.com/repos/${project.repo}/compare/${encodeURIComponent(project.defaultBranch)}...${encodeURIComponent(input.branch)}`, { headers: githubHeaders() }) as Record<string, unknown>;
  const files = Array.isArray(compare.files) ? compare.files as Array<Record<string, unknown>> : [];
  const root = safePath(project.gamePath);
  const changedFiles = files.map((file) => String(file.filename || ""));
  const escaped = changedFiles.filter((file) => file !== root && !file.startsWith(`${root}/`));
  const status = String(compare.status || "unknown");
  return {
    projectId: project.id,
    repo: project.repo,
    branch: input.branch,
    base: project.defaultBranch,
    status,
    aheadBy: compare.ahead_by ?? null,
    changedFiles,
    scopeSafe: escaped.length === 0,
    escapedFiles: escaped,
    passed: changedFiles.length > 0 && escaped.length === 0 && status !== "behind" && status !== "diverged",
  };
}

export async function githubCreateProjectPullRequest(input: { projectId: string; branch: string; title: string; body?: string }) {
  requireWrites();
  const verification = await githubVerifyProjectBranch({ projectId: input.projectId, branch: input.branch });
  if (!verification.passed) throw new Error("Project verification failed; pull request creation is blocked.");
  const project = getProject(input.projectId);
  const data = await githubJson(`https://api.github.com/repos/${project.repo}/pulls`, { method: "POST", headers: { ...githubHeaders(), "content-type": "application/json" }, body: JSON.stringify({ title: input.title, body: input.body || "Prepared by Game Shop MCP after project-scope verification.", head: input.branch, base: project.defaultBranch }) }) as Record<string, unknown>;
  return { projectId: project.id, repo: project.repo, number: data.number ?? null, url: data.html_url ?? null, branch: input.branch, base: project.defaultBranch, verification };
}

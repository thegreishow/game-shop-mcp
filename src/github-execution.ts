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
  const normalized = path.replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) throw new Error("Invalid repository path.");
  return normalized;
}

export async function githubReadProjectFile(input: { projectId: string; path: string; ref?: string }) {
  const project = getProject(input.projectId);
  const path = safePath(input.path);
  const ref = input.ref || project.defaultBranch;
  const url = `https://api.github.com/repos/${project.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const data = await githubJson(url, { headers: githubHeaders() }) as Record<string, unknown>;
  if (data.type !== "file" || typeof data.content !== "string") throw new Error("Requested path is not a readable file.");
  const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { projectId: project.id, repo: project.repo, ref, path, sha: data.sha, content };
}

export async function githubUpsertProjectFile(input: { projectId: string; path: string; content: string; message: string; branch?: string; sha?: string }) {
  if (!githubWritesAllowed()) throw new Error("GitHub writes are disabled. Set GAME_SHOP_ALLOW_GITHUB_WRITES=true to opt in.");
  const project = getProject(input.projectId);
  const path = safePath(input.path);
  const branch = input.branch || project.defaultBranch;
  const payload: Record<string, unknown> = {
    message: input.message,
    content: Buffer.from(input.content, "utf8").toString("base64"),
    branch,
  };
  if (input.sha) payload.sha = input.sha;
  const url = `https://api.github.com/repos/${project.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const data = await githubJson(url, { method: "PUT", headers: { ...githubHeaders(), "content-type": "application/json" }, body: JSON.stringify(payload) }) as Record<string, unknown>;
  const commit = data.commit as Record<string, unknown> | undefined;
  return { projectId: project.id, repo: project.repo, branch, path, commitSha: commit?.sha ?? null };
}

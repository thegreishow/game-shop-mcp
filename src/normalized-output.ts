import type { ArtifactKind } from "./artifacts.js";

export type NormalizedOutputAsset = {
  url: string;
  kind: ArtifactKind;
  mimeType?: string;
  role?: "primary" | "preview" | "source" | "metadata";
};

export type NormalizedProviderOutput = {
  provider: string;
  status: "queued" | "running" | "ready" | "failed" | "unknown";
  providerJobId?: string;
  assets: NormalizedOutputAsset[];
  metadata: Record<string, unknown>;
  raw: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function jobId(value: unknown): string | undefined {
  const root = record(value);
  const nested = record(root.result);
  const id =
    root.id ??
    root.request_id ??
    root.requestId ??
    root.task_id ??
    root.taskId ??
    root.job_id ??
    root.jobId ??
    root.prediction_id ??
    nested.id ??
    nested.request_id ??
    nested.job_id;
  return id == null ? undefined : String(id);
}

function normalizeStatus(value: unknown): NormalizedProviderOutput["status"] {
  const root = record(value);
  const nested = record(root.result);
  const raw = String(root.status ?? root.state ?? nested.status ?? nested.state ?? "unknown").toLowerCase();
  if (/succeed|complete|ready|finished|done/.test(raw)) return "ready";
  if (/fail|cancel|error|rejected/.test(raw)) return "failed";
  if (/queue|pending|created|waiting/.test(raw)) return "queued";
  if (/run|process|progress|start/.test(raw)) return "running";
  return "unknown";
}

function kindForUrl(url: string, keyHint = ""): ArtifactKind {
  const lower = `${url} ${keyHint}`.toLowerCase();
  if (/spritesheet/.test(lower)) return "spritesheet";
  if (/sprite/.test(lower)) return "sprite";
  if (/\.glb($|\?)|\.gltf($|\?)|model|3d/.test(lower)) return "3d";
  if (/\.mp4($|\?)|\.webm($|\?)|video/.test(lower)) return "video";
  if (/\.mp3($|\?)|\.wav($|\?)|\.ogg($|\?)|audio|speech|music|sound/.test(lower)) return "audio";
  if (/\.png($|\?)|\.jpe?g($|\?)|\.webp($|\?)|image/.test(lower)) return "image";
  if (/\.zip($|\?)|\.tar($|\?)|archive/.test(lower)) return "archive";
  if (/\.json($|\?)|data/.test(lower)) return "data";
  return "other";
}

function mimeForKind(kind: ArtifactKind) {
  if (kind === "image" || kind === "sprite" || kind === "spritesheet") return "image/*";
  if (kind === "video") return "video/*";
  if (kind === "audio") return "audio/*";
  if (kind === "3d") return "model/*";
  if (kind === "data") return "application/json";
  if (kind === "archive") return "application/zip";
  return undefined;
}

function collectAssets(value: unknown, keyHint = "", seen = new Set<string>(), depth = 0): NormalizedOutputAsset[] {
  if (depth > 8 || value == null) return [];
  if (typeof value === "string") {
    if (!/^https:\/\//i.test(value) || seen.has(value)) return [];
    seen.add(value);
    const kind = kindForUrl(value, keyHint);
    return [{ url: value, kind, mimeType: mimeForKind(kind), role: seen.size === 1 ? "primary" : "source" }];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectAssets(item, keyHint, seen, depth + 1));
  if (typeof value === "object") {
    const output: NormalizedOutputAsset[] = [];
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/url|output|asset|file|image|video|audio|model|preview|result/i.test(key)) {
        output.push(...collectAssets(nested, key, seen, depth + 1));
      }
    }
    if (!output.length) {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        output.push(...collectAssets(nested, key, seen, depth + 1));
      }
    }
    return output;
  }
  return [];
}

export function normalizeProviderOutput(provider: string, raw: unknown): NormalizedProviderOutput {
  const root = record(raw);
  const wrappedResult = root.result ?? root.output ?? raw;
  const assets = collectAssets(wrappedResult);
  return {
    provider,
    status: normalizeStatus(wrappedResult),
    providerJobId: jobId(wrappedResult) ?? jobId(raw),
    assets,
    metadata: {
      assetCount: assets.length,
      sourceShape: Array.isArray(wrappedResult) ? "array" : typeof wrappedResult,
    },
    raw,
  };
}

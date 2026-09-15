export class ProviderRequestError extends Error {
  constructor(public provider: string, public status: number) {
    super(`${provider} request failed (${status}).`);
    this.name = "ProviderRequestError";
  }
}

function redactDiagnostic(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-=]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})\b/g, "[redacted]")
    .replace(/(token|secret|api[_-]?key|authorization|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 4000);
}

function diagnosticId() {
  return `gs_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function publicErrorMessage(error: unknown) {
  if (error instanceof ProviderRequestError) return error.message;
  if (error instanceof Error) {
    const safe = [
      "Paid generation is disabled.",
      "AUTOSPRITE_API_KEY is not configured",
      "SPRITECOOK_API_KEY is not configured",
      "GitHub execution is not configured.",
      "GitHub writes are disabled.",
      "Project is not configured in the Game Shop allowlist.",
      "Invalid repository path.",
      "Requested path is not a readable file.",
    ];
    if (safe.some((prefix) => error.message.startsWith(prefix))) return error.message;
  }

  const id = diagnosticId();
  const diagnostic = error instanceof Error
    ? {
        id,
        name: redactDiagnostic(error.name || "Error"),
        message: redactDiagnostic(error.message || "Unknown error"),
        stack: error.stack ? redactDiagnostic(error.stack) : undefined,
      }
    : { id, name: "UnknownThrownValue", message: redactDiagnostic(String(error)) };

  console.error("[Game Shop tool error]", diagnostic);
  return `Game Shop request failed. Error ID ${id}. Check server logs for details.`;
}

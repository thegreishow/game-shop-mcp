export class ProviderRequestError extends Error {
  constructor(public provider: string, public status: number) {
    super(`${provider} request failed (${status}).`);
    this.name = "ProviderRequestError";
  }
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
  return "Game Shop request failed. Check server logs for details.";
}

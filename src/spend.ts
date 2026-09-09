/**
 * Spend lock.
 * Paid provider generation is blocked unless a human explicitly opts in.
 */
export const PAID_GENERATION_BLOCKED_MESSAGE =
  "Paid generation is disabled. This gateway will not call provider endpoints that consume credits or money. Leave GAME_SHOP_ALLOW_PAID_GENERATION unset.";

export function paidGenerationAllowed(): boolean {
  return process.env.GAME_SHOP_ALLOW_PAID_GENERATION === "true";
}

export function assertPaidGenerationAllowed(action: string): void {
  if (!paidGenerationAllowed()) throw new Error(`${PAID_GENERATION_BLOCKED_MESSAGE} Blocked action: ${action}.`);
}

export function spendPolicy() {
  const allowPaid = paidGenerationAllowed();
  return {
    mode: allowPaid ? "paid-generation-enabled" : "free-only",
    allowPaidGeneration: allowPaid,
    money: allowPaid ? "opted-in" : "blocked",
    rule: "Any provider operation that can create a billable generation job must call assertPaidGenerationAllowed() immediately before the provider request.",
    paidGenerationActions: ["autosprite.createCharacter", "autosprite.generateAnimations", "spritecook.generate"],
    unaffectedCapabilities: ["routing", "planning", "catalogs", "provider-status", "project-context", "github-read"],
    separateWriteLock: "GitHub writes are controlled independently by GAME_SHOP_ALLOW_GITHUB_WRITES.",
  } as const;
}

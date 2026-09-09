/**
 * Spend lock.
 *
 * Game Shop MCP must not spend money unless a human explicitly opts in.
 * Paid generation is blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true.
 * Missing, empty, or any other value means no paid calls.
 */

export const PAID_GENERATION_BLOCKED_MESSAGE =
  "Paid generation is disabled. This gateway will not call provider endpoints that consume credits or money. Leave GAME_SHOP_ALLOW_PAID_GENERATION unset.";

export function paidGenerationAllowed(): boolean {
  return process.env.GAME_SHOP_ALLOW_PAID_GENERATION === "true";
}

export function assertPaidGenerationAllowed(action: string): void {
  if (!paidGenerationAllowed()) {
    throw new Error(`${PAID_GENERATION_BLOCKED_MESSAGE} Blocked action: ${action}.`);
  }
}

export function spendPolicy() {
  const allowPaid = paidGenerationAllowed();
  return {
    mode: allowPaid ? "paid-generation-enabled" : "free-only",
    allowPaidGeneration: allowPaid,
    money: allowPaid ? "opted-in" : "blocked",
    rule: "Provider endpoints that create new paid jobs are blocked unless GAME_SHOP_ALLOW_PAID_GENERATION=true.",
    blockedUntilOptIn: [
      "gameshop_generate_character",
      "gameshop_generate_animation",
      "gameshop_spritecook_generate",
    ],
    stillAllowed: [
      "gameshop_list_providers",
      "gameshop_capability_catalog",
      "gameshop_spend_policy",
      "gameshop_generation_status",
      "gameshop_get_spritesheet",
      "gameshop_spritecook_models",
      "gameshop_spritecook_status",
    ],
  } as const;
}

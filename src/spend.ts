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
    fallbackRule: "Do not automatically resubmit an ambiguous provider generation failure to another vendor; verify whether the first job exists before retrying to avoid duplicate spend.",
    paidGenerationActions: [
      "autosprite.createCharacter",
      "autosprite.generateAnimations",
      "spritecook.generate",
      "meshy.textTo3D",
      "fal.inference",
      "replicate.prediction",
      "ludo.generation",
      "elevenlabs.speech",
      "scenario.generation",
      "SDK replicate:*",
      "SDK fal:*",
      "SDK elevenlabs:*",
      "SDK scenario:*"
    ],
    nonGenerationMutations: [
      "cloudinary.upload",
      "artifact.persist",
      "artifact.place",
      "github.patch",
      "preview.deploy"
    ],
    unaffectedCapabilities: ["routing", "planning", "catalogs", "provider-status", "provider-health", "sdk-status", "project-context", "github-read", "artifact-read"],
    separateWriteLocks: {
      github: "GAME_SHOP_ALLOW_GITHUB_WRITES",
      externalIntegrations: "GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS"
    }
  } as const;
}

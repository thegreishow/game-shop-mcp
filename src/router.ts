import { providerStatus, type ProviderInfo, type ProviderName } from "./providers.js";

export type CapabilityRequest =
  | "character"
  | "character-animation"
  | "spritesheet"
  | "pixel-art"
  | "ui-art"
  | "texture"
  | "tileset"
  | "background-removal"
  | "general-game-art";

export type RoutePreference = "quality" | "speed" | "cost" | "balanced";

export type RouteRequest = {
  capability: CapabilityRequest;
  preference?: RoutePreference;
  requireConfigured?: boolean;
  requireImplemented?: boolean;
};

type RouteCandidate = {
  provider: ProviderName;
  capabilities: CapabilityRequest[];
  implementationReady: boolean;
  quality: number;
  speed: number;
  costEfficiency: number;
  notes: string;
};

const candidates: RouteCandidate[] = [
  {
    provider: "autosprite",
    capabilities: ["character", "character-animation", "spritesheet"],
    implementationReady: true,
    quality: 8,
    speed: 8,
    costEfficiency: 8,
    notes: "Strong default for character creation and engine-ready character spritesheets.",
  },
  {
    provider: "spritecook",
    capabilities: ["character", "character-animation", "pixel-art", "ui-art", "texture", "tileset", "background-removal", "general-game-art"],
    implementationReady: true,
    quality: 9,
    speed: 7,
    costEfficiency: 7,
    notes: "Broad game-art coverage with models, animation, UI, textures, tilesets and editing utilities.",
  },
  {
    provider: "spriteship",
    capabilities: ["character", "character-animation", "spritesheet", "pixel-art", "general-game-art"],
    implementationReady: false,
    quality: 8,
    speed: 8,
    costEfficiency: 7,
    notes: "Promising primary game-art provider; direct adapter still needs to be implemented in the gateway.",
  },
  {
    provider: "sprite-ai",
    capabilities: ["character", "character-animation", "pixel-art", "tileset", "general-game-art"],
    implementationReady: false,
    quality: 8,
    speed: 7,
    costEfficiency: 7,
    notes: "Useful for pixel-art, sprites, animation, restyling and map-style assets; direct adapter still pending.",
  },
  {
    provider: "spritesheet-ai",
    capabilities: ["character-animation", "spritesheet", "pixel-art"],
    implementationReady: false,
    quality: 9,
    speed: 7,
    costEfficiency: 6,
    notes: "Specialized in aligned multi-animation spritesheets and engine-ready exports; adapter pending exact API contract verification.",
  },
];

function score(candidate: RouteCandidate, preference: RoutePreference) {
  if (preference === "quality") return candidate.quality * 0.65 + candidate.speed * 0.15 + candidate.costEfficiency * 0.2;
  if (preference === "speed") return candidate.speed * 0.65 + candidate.quality * 0.2 + candidate.costEfficiency * 0.15;
  if (preference === "cost") return candidate.costEfficiency * 0.65 + candidate.quality * 0.2 + candidate.speed * 0.15;
  return candidate.quality * 0.4 + candidate.speed * 0.3 + candidate.costEfficiency * 0.3;
}

export function routeCapability(request: RouteRequest) {
  const preference = request.preference ?? "balanced";
  const requireConfigured = request.requireConfigured ?? true;
  const requireImplemented = request.requireImplemented ?? true;
  const status = new Map<ProviderName, ProviderInfo>(providerStatus().map((provider) => [provider.name, provider]));

  const ranked = candidates
    .filter((candidate) => candidate.capabilities.includes(request.capability))
    .map((candidate) => {
      const provider = status.get(candidate.provider);
      return {
        ...candidate,
        configured: provider?.configured ?? false,
        integration: provider?.integration ?? "planned",
        score: Number(score(candidate, preference).toFixed(2)),
      };
    })
    .filter((candidate) => !requireConfigured || candidate.configured)
    .filter((candidate) => !requireImplemented || candidate.implementationReady)
    .sort((a, b) => b.score - a.score);

  return {
    capability: request.capability,
    preference,
    constraints: { requireConfigured, requireImplemented },
    selected: ranked[0] ?? null,
    alternatives: ranked.slice(1),
  };
}

export function routingMatrix() {
  return candidates;
}

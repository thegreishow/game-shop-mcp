import { spendPolicy } from "./spend.js";

export const buildCapabilities = {
  spend: spendPolicy(),
  ui: {
    reactBits: {
      name: "React Bits",
      kind: "component-registry",
      homepage: "https://reactbits.dev",
      registry: "@react-bits",
      categories: ["text animations", "animations", "backgrounds", "components"],
      note: "Use the official React Bits/shadcn registry in the target React project. Do not mirror or proxy licensed React Bits Pro source through Game Shop MCP.",
    },
    reactBitsPro: {
      name: "React Bits Pro",
      kind: "licensed-component-registry",
      homepage: "https://pro.reactbits.dev",
      registries: ["@reactbits-starter", "@reactbits-pro"],
      requires: ["REACTBITS_LICENSE_KEY", "shadcn >= 3"],
      note: "Agents should install licensed components directly from the official registry into the target project. Game Shop MCP may orchestrate the workflow but must not re-expose the registry/source.",
    },
    animejs: {
      name: "Anime.js",
      kind: "animation-library",
      package: "animejs",
      preferredMajor: 4,
      capabilities: ["DOM", "CSS", "SVG", "JS objects", "timelines", "draggable", "scroll", "WAAPI", "React scopes"],
      install: "npm install animejs",
    },
  },
  gameArt: ["spriteship", "autosprite", "sprite-ai", "spritesheet-ai", "spritecook"],
  modelGateways: ["aimlapi", "deepseek"],
} as const;

export function capabilityCatalog() {
  return {
    ...buildCapabilities,
    spend: spendPolicy(),
  };
}

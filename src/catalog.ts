import { ecosystemCatalog } from "./ecosystem-catalog.js";
import { gameWorkflowMatrix } from "./game-workflow-router.js";
import { websiteWorkflowMatrix } from "./website-workflow-router.js";
import { appWorkflowMatrix } from "./app-workflow-router.js";
import { mediaWorkflowMatrix } from "./media-workflow-router.js";
import { missionControlInfo } from "./mission-control.js";
import { missionProjectRegistryInfo } from "./mission-projects.js";
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
      kind: "installed-animation-library",
      package: "animejs",
      version: "^4.5.0",
      preferredMajor: 4,
      capabilities: ["DOM", "CSS", "SVG", "JS objects", "timelines", "draggable", "scroll", "WAAPI", "React scopes"],
      install: "npm install animejs@4.5.0",
      projectRuntime: "Use Anime.js in target browser projects for UI/HUD choreography; do not use it as a replacement for the game simulation/render loop.",
    },
  },
  gameArt: ["spriteship", "autosprite", "sprite-ai", "spritesheet-ai", "spritecook"],
  missionControl: missionControlInfo(),
  projectMissionRegistry: missionProjectRegistryInfo(),
  gameWorkflow: gameWorkflowMatrix(),
  websiteWorkflow: websiteWorkflowMatrix(),
  appWorkflow: appWorkflowMatrix(),
  mediaWorkflow: mediaWorkflowMatrix(),
  modelGateways: ["aimlapi", "deepseek"],
} as const;

export function capabilityCatalog() {
  return {
    ...buildCapabilities,
    ecosystem: ecosystemCatalog(),
    spend: spendPolicy(),
  };
}

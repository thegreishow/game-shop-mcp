export type IntegrationKind = "mcp" | "api" | "cli" | "registry" | "library" | "desktop-mcp" | "reference";
export type IntegrationState = "ready" | "needs-auth" | "local-app-required" | "installable" | "research";

export type Integration = {
  id: string;
  name: string;
  kinds: IntegrationKind[];
  state: IntegrationState;
  domains: string[];
  endpoint?: string;
  install?: string;
  env?: string[];
  auth?: string;
  capabilities: string[];
  notes: string;
};

// Only verified integration contracts belong here. Catalogued products whose API/MCP
// contract has not been verified remain in ECOSYSTEM.md until researched.
const integrations: Integration[] = [
  {
    id: "21st-dev",
    name: "21st.dev",
    kinds: ["mcp", "cli", "registry"],
    state: "needs-auth",
    domains: ["ui", "agent-platform"],
    endpoint: "https://21st.dev/api/mcp",
    install: "npx @21st-dev/cli@latest init --client codex",
    env: ["API_KEY_21ST"],
    auth: "MCP supports API-key authentication and OAuth/client-specific flows; CLI supports login or API_KEY_21ST for automation.",
    capabilities: ["component-search", "component-install", "ui-generation", "themes", "templates", "publishing", "mcp-app-ui"],
    notes: "Use the official stateless MCP/CLI. The single MCP endpoint can return regular tool results or MCP Apps UI when the client negotiates UI support.",
  },
  {
    id: "motion-ai-kit",
    name: "Motion AI Kit",
    kinds: ["mcp", "cli", "library"],
    state: "installable",
    domains: ["motion", "ui", "3d"],
    install: "npx motion-ai@latest",
    auth: "Free hosted MCP provides current documentation search; Motion+ capabilities use sign-in through the MCP client.",
    capabilities: ["motion-docs", "example-search", "transition-editor", "performance-audit", "css-generation", "threejs-motion", "motion-ui-source"],
    notes: "Current installer wires hosted MCP servers and the /motion skill. Older TOKEN-based local MCP configuration is retired.",
  },
  {
    id: "spline-mcp",
    name: "Spline MCP Server",
    kinds: ["desktop-mcp", "api"],
    state: "local-app-required",
    domains: ["3d", "ui", "agent-platform"],
    auth: "Bundled with the Spline desktop app. The desktop app registers supported MCP clients automatically.",
    capabilities: ["create-scene", "edit-scene", "generate-3d", "generate-image", "layout", "scene-code-api", "realtime-api"],
    notes: "Cannot be hosted inside the Game Shop Vercel gateway: the official MCP server runs through an open Spline desktop app. Game Shop should route local-capable agents to it and use Spline web/runtime exports in target projects.",
  },
  {
    id: "kokonutui",
    name: "KokonutUI",
    kinds: ["mcp", "registry", "cli"],
    state: "installable",
    domains: ["ui", "motion"],
    install: "npx shadcn@latest mcp init --client codex",
    capabilities: ["component-search", "component-install", "registry-dependency-resolution", "react-ui", "motion-components"],
    notes: "Use the official shadcn MCP with the @kokonutui namespace configured as https://kokonutui.com/r/{name}.json in target project components.json. Components install via npx shadcn@latest add @kokonutui/<name>.",
  },
  {
    id: "cult-ui",
    name: "Cult UI",
    kinds: ["mcp", "registry", "cli"],
    state: "installable",
    domains: ["ui", "motion"],
    install: "npx shadcn@latest mcp init --client codex",
    capabilities: ["component-search", "component-install", "registry-browse", "landing-page-ui", "motion-ui"],
    notes: "Use the shadcn MCP with @cult-ui mapped to https://cult-ui.com/r/{name}.json. Cult UI Pro uses a separate licensed registry/API-key flow and must not be mirrored.",
  },
  {
    id: "animate-ui",
    name: "Animate UI",
    kinds: ["mcp", "registry", "cli"],
    state: "installable",
    domains: ["ui", "motion"],
    install: "npx shadcn@latest mcp init --client codex",
    capabilities: ["animated-components", "component-search", "component-install", "motion-ui"],
    notes: "Animate UI uses the standard shadcn MCP workflow. Configure its registry in the target project and let the shadcn MCP resolve/install components.",
  },
  {
    id: "preline-ui",
    name: "Preline UI MCP",
    kinds: ["mcp", "cli", "registry"],
    state: "needs-auth",
    domains: ["ui", "agent-platform"],
    endpoint: "https://mcp.preline.co",
    install: "npx skills add htmlstreamofficial/preline",
    env: ["PRELINE_API_KEY"],
    auth: "Hosted Streamable HTTP MCP requires Authorization: Bearer TOKEN_KEY. Preline Agent Skills can be installed separately for workflow guidance.",
    capabilities: ["components-list", "component-source", "blocks", "component-docs", "framework-docs", "themes", "preline-init"],
    notes: "Hosted MCP. Keep the API key in secret storage and connect clients with a bearer header; do not commit the token.",
  },
  {
    id: "daisyui-mcp",
    name: "daisyUI MCP",
    kinds: ["mcp", "library"],
    state: "installable",
    domains: ["ui", "agent-platform"],
    capabilities: ["daisyui-code-generation", "component-guidance", "theme-guidance"],
    notes: "daisyUI publishes an official MCP/code-generator flow for coding tools including Codex and Grok Build. Exact client configuration should be generated from the current official setup page rather than hard-coded here.",
  },
  {
    id: "animejs",
    name: "Anime.js",
    kinds: ["library"],
    state: "installable",
    domains: ["motion", "ui"],
    install: "npm install animejs",
    capabilities: ["timeline", "dom-animation", "svg-animation", "js-object-animation", "stagger", "drag", "scroll"],
    notes: "Local runtime library; no remote API is required for Game Shop to use it in a target project.",
  },
  {
    id: "threejs",
    name: "Three.js",
    kinds: ["library"],
    state: "installable",
    domains: ["3d", "shader"],
    install: "npm install three",
    capabilities: ["webgl", "webgpu", "scene", "gltf", "shader", "postprocessing"],
    notes: "Local runtime library; no remote MCP/API is required for normal project integration.",
  },
  {
    id: "lenis",
    name: "Lenis",
    kinds: ["library"],
    state: "installable",
    domains: ["motion", "ui", "3d"],
    install: "npm install lenis",
    capabilities: ["smooth-scroll", "scroll-sync", "webgl-scroll"],
    notes: "Local runtime library; route it into target projects when smooth scrolling/render-loop synchronization is needed.",
  },
  {
    id: "gsap",
    name: "GSAP",
    kinds: ["library"],
    state: "installable",
    domains: ["motion", "ui"],
    install: "npm install gsap",
    capabilities: ["timeline", "scroll", "svg", "cinematic-motion"],
    notes: "Local runtime integration. Game Shop should respect current GSAP licensing and package terms in target projects.",
  },
  {
    id: "spline-code-api",
    name: "Spline Code API",
    kinds: ["api"],
    state: "ready",
    domains: ["3d", "ui"],
    capabilities: ["scene-variables", "object-properties", "events", "transitions", "runtime-interactivity"],
    notes: "Developer-facing runtime API for controlling exported Spline scenes from application code; distinct from Spline's in-editor Real-time API.",
  },
];

export function integrationRegistry() { return integrations; }
export function integrationStatus(id?: string) {
  if (!id) return integrations;
  return integrations.find((integration) => integration.id === id) ?? null;
}

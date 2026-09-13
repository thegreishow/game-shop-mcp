export type CapabilityPlacement = "core-adapter" | "optional-adapter" | "project-dependency" | "python-template";

export type WebGameCapability = {
  id: string;
  name: string;
  placement: CapabilityPlacement;
  packageName?: string;
  install?: string;
  env?: string[];
  capabilities: string[];
  notes: string;
};

const capabilities: WebGameCapability[] = [
  {
    id: "stripe-server",
    name: "Stripe Node SDK",
    placement: "core-adapter",
    packageName: "stripe",
    install: "npm install stripe",
    env: ["STRIPE_SECRET_KEY"],
    capabilities: ["payments", "checkout", "billing", "subscriptions", "webhooks"],
    notes: "Server-side adapter candidate. Keep secret/restricted keys server-side; browser Stripe.js remains a generated-project dependency.",
  },
  {
    id: "supabase-js",
    name: "Supabase JavaScript SDK",
    placement: "core-adapter",
    packageName: "@supabase/supabase-js",
    install: "npm install @supabase/supabase-js",
    env: ["GAME_SHOP_SUPABASE_URL", "GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY"],
    capabilities: ["postgres", "auth", "storage", "realtime", "functions"],
    notes: "Game Shop already uses Supabase as durable infrastructure; direct SDK usage should remain server-safe and RLS-aware.",
  },
  {
    id: "openai-node",
    name: "OpenAI Node SDK",
    placement: "optional-adapter",
    packageName: "openai",
    install: "npm install openai",
    env: ["OPENAI_API_KEY"],
    capabilities: ["model-inference", "responses", "embeddings", "tool-calling"],
    notes: "Optional direct-provider adapter. Do not make Game Shop depend on one model provider for core orchestration.",
  },
  {
    id: "firebase-web",
    name: "Firebase JavaScript SDK",
    placement: "project-dependency",
    packageName: "firebase",
    install: "npm install firebase",
    capabilities: ["auth", "firestore", "storage", "functions", "app-check"],
    notes: "Keep the modular Firebase web SDK project-scoped. Game Shop should only gain privileged Firebase server access through the separate firebase-admin package and an explicitly gated admin adapter.",
  },
  {
    id: "clerk-backend",
    name: "Clerk JavaScript Backend SDK",
    placement: "optional-adapter",
    packageName: "@clerk/backend",
    install: "npm install @clerk/backend",
    env: ["CLERK_SECRET_KEY"],
    capabilities: ["authentication", "users", "organizations", "sessions"],
    notes: "Current general Node backend package. Wired through createClerkClient({ secretKey }); do not install deprecated @clerk/clerk-sdk-node.",
  },
  {
    id: "lootlocker-rest",
    name: "LootLocker REST API",
    placement: "optional-adapter",
    env: ["LOOTLOCKER_API_KEY"],
    capabilities: ["players", "leaderboards", "inventory", "progression", "economy", "game-backend"],
    notes: "API-first for web/Node orchestration. Official engine SDKs are available for Unity, Unreal and Godot; do not assume an official generic npm SDK.",
  },
  {
    id: "igdb-api",
    name: "IGDB API",
    placement: "optional-adapter",
    packageName: "igdb-api-node",
    install: "npm install igdb-api-node",
    env: ["IGDB_CLIENT_ID", "IGDB_ACCESS_TOKEN"],
    capabilities: ["game-metadata", "covers", "companies", "genres", "release-dates", "search"],
    notes: "Wired through the Twitch-maintained igdb-api-node wrapper using Client ID + App Access Token. Keep credentials server-side and treat the integration as read-oriented metadata access.",
  },
  {
    id: "react-query",
    name: "TanStack Query",
    placement: "project-dependency",
    packageName: "@tanstack/react-query",
    install: "npm install @tanstack/react-query",
    capabilities: ["server-state", "caching", "query-retries", "mutation-state"],
    notes: "Generated React applications only unless Game Shop gains a React control surface that directly needs it.",
  },
  {
    id: "stripe-js",
    name: "Stripe.js",
    placement: "project-dependency",
    packageName: "@stripe/stripe-js",
    install: "npm install @stripe/stripe-js",
    capabilities: ["checkout-ui", "payment-element", "browser-payments"],
    notes: "Browser/client package. Never use it as the server-side Stripe integration.",
  },
  {
    id: "socket-io",
    name: "Socket.IO",
    placement: "project-dependency",
    packageName: "socket.io",
    install: "npm install socket.io socket.io-client",
    capabilities: ["realtime", "multiplayer", "presence", "custom-events"],
    notes: "Generated servers/clients when custom realtime is needed. Prefer existing Supabase Realtime when it satisfies the workload.",
  },
  {
    id: "phaser",
    name: "Phaser",
    placement: "project-dependency",
    packageName: "phaser",
    install: "npm install phaser",
    capabilities: ["2d-game", "scenes", "physics", "sprites", "input"],
    notes: "Generated browser-game dependency; not a Game Shop server dependency.",
  },
  {
    id: "three",
    name: "Three.js",
    placement: "project-dependency",
    packageName: "three",
    install: "npm install three",
    capabilities: ["3d", "webgl", "webgpu", "gltf", "shaders"],
    notes: "Generated 3D experience dependency; Game Shop should orchestrate it without loading it into the server runtime unless an adapter needs it.",
  },
  {
    id: "express",
    name: "Express",
    placement: "project-dependency",
    packageName: "express",
    install: "npm install express",
    capabilities: ["http-server", "routing", "middleware"],
    notes: "Generated Node backend dependency, not a required Game Shop runtime dependency.",
  },
  {
    id: "mongoose",
    name: "Mongoose",
    placement: "project-dependency",
    packageName: "mongoose",
    install: "npm install mongoose",
    capabilities: ["mongodb", "schemas", "documents"],
    notes: "Only install for MongoDB-backed target projects; Game Shop durable state remains Postgres/Supabase-first.",
  },
  {
    id: "axios",
    name: "Axios",
    placement: "project-dependency",
    packageName: "axios",
    install: "npm install axios",
    capabilities: ["http-client"],
    notes: "Optional. Native fetch remains the default unless a provider or generated project has a concrete Axios-specific need.",
  },
  {
    id: "dotenv",
    name: "dotenv",
    placement: "optional-adapter",
    packageName: "dotenv",
    install: "npm install dotenv",
    capabilities: ["local-env-loading"],
    notes: "Useful for local Node runtimes; hosted environments should use platform-managed environment variables.",
  },
  {
    id: "fastapi",
    name: "FastAPI",
    placement: "python-template",
    install: "python -m pip install fastapi uvicorn",
    capabilities: ["python-api", "asgi", "openapi"],
    notes: "Generated Python backend template dependency; not installed into the Node Game Shop runtime.",
  },
];

export function webGameBackendCapabilities() {
  return capabilities;
}

export function webGameBackendCapability(id: string) {
  return capabilities.find((entry) => entry.id === id) ?? null;
}

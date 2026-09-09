export type MotionCapability =
  | "micro-interaction"
  | "react-animation"
  | "layout-animation"
  | "gesture"
  | "drag"
  | "scroll-triggered"
  | "scroll-linked"
  | "timeline"
  | "svg-animation"
  | "dom-animation"
  | "js-object-animation"
  | "game-hud"
  | "game-menu"
  | "component-effect";

export type MotionPreference = "quality" | "speed" | "bundle" | "react-native-fit" | "balanced";

export type MotionRouteRequest = {
  capability: MotionCapability;
  preference?: MotionPreference;
  framework?: "react" | "vanilla" | "vue" | "phaser-overlay" | "any";
};

type MotionEngine = {
  engine: "animejs" | "motion" | "gsap" | "react-bits" | "css";
  capabilities: MotionCapability[];
  frameworks: MotionRouteRequest["framework"][];
  quality: number;
  speed: number;
  bundle: number;
  reactFit: number;
  install?: string;
  notes: string;
};

const engines: MotionEngine[] = [
  {
    engine: "animejs",
    capabilities: ["micro-interaction", "timeline", "svg-animation", "dom-animation", "js-object-animation", "game-hud", "game-menu"],
    frameworks: ["react", "vanilla", "vue", "phaser-overlay", "any"],
    quality: 9, speed: 9, bundle: 9, reactFit: 7,
    install: "npm install animejs",
    notes: "Excellent general-purpose choreography for DOM, CSS, SVG and JavaScript objects; strong default for custom game UI and hybrid overlays.",
  },
  {
    engine: "motion",
    capabilities: ["micro-interaction", "react-animation", "layout-animation", "gesture", "drag", "scroll-triggered", "scroll-linked", "timeline", "svg-animation", "dom-animation", "js-object-animation", "game-hud", "game-menu"],
    frameworks: ["react", "vanilla", "vue", "phaser-overlay", "any"],
    quality: 9, speed: 9, bundle: 8, reactFit: 10,
    install: "npm install motion",
    notes: "Preferred for React state/layout animation, gestures and performant scroll-linked motion; also supports vanilla JavaScript and Vue.",
  },
  {
    engine: "gsap",
    capabilities: ["micro-interaction", "scroll-triggered", "scroll-linked", "timeline", "svg-animation", "dom-animation", "js-object-animation", "game-hud", "game-menu"],
    frameworks: ["react", "vanilla", "vue", "phaser-overlay", "any"],
    quality: 10, speed: 8, bundle: 6, reactFit: 7,
    install: "npm install gsap",
    notes: "Use for complex cinematic timelines, pin/scrub/snap scroll experiences and unusually demanding choreography.",
  },
  {
    engine: "react-bits",
    capabilities: ["component-effect", "micro-interaction", "react-animation", "game-menu"],
    frameworks: ["react", "phaser-overlay", "any"],
    quality: 9, speed: 10, bundle: 8, reactFit: 10,
    notes: "Use the official React Bits registry for ready-made premium React effects/components; do not mirror licensed Pro source through Game Shop.",
  },
  {
    engine: "css",
    capabilities: ["micro-interaction", "dom-animation", "game-hud", "game-menu"],
    frameworks: ["react", "vanilla", "vue", "phaser-overlay", "any"],
    quality: 7, speed: 10, bundle: 10, reactFit: 9,
    notes: "Best for simple transitions/keyframes where a runtime animation dependency would be unnecessary.",
  },
];

function score(engine: MotionEngine, preference: MotionPreference) {
  if (preference === "quality") return engine.quality * .65 + engine.speed * .15 + engine.bundle * .1 + engine.reactFit * .1;
  if (preference === "speed") return engine.speed * .6 + engine.quality * .2 + engine.bundle * .15 + engine.reactFit * .05;
  if (preference === "bundle") return engine.bundle * .65 + engine.speed * .15 + engine.quality * .15 + engine.reactFit * .05;
  if (preference === "react-native-fit") return engine.reactFit * .65 + engine.quality * .15 + engine.speed * .1 + engine.bundle * .1;
  return engine.quality * .35 + engine.speed * .25 + engine.bundle * .2 + engine.reactFit * .2;
}

export function routeMotion(request: MotionRouteRequest) {
  const preference = request.preference ?? "balanced";
  const framework = request.framework ?? "any";
  const ranked = engines
    .filter((engine) => engine.capabilities.includes(request.capability))
    .filter((engine) => framework === "any" || engine.frameworks.includes(framework) || engine.frameworks.includes("any"))
    .map((engine) => ({ ...engine, score: Number(score(engine, preference).toFixed(2)) }))
    .sort((a, b) => b.score - a.score);
  return { capability: request.capability, preference, framework, selected: ranked[0] ?? null, alternatives: ranked.slice(1) };
}

export function motionRoutingMatrix() { return engines; }

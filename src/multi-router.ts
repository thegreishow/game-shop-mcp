export type BuildDomain = "ui" | "motion" | "3d" | "shader" | "video" | "design-reference" | "agent-platform";
export type BuildPreference = "quality" | "speed" | "cost" | "performance" | "open-source" | "balanced";
export type BuildFramework = "react" | "vanilla" | "vue" | "phaser-overlay" | "any";

type Engine = {
  engine: string;
  domain: BuildDomain;
  capabilities: string[];
  frameworks: BuildFramework[];
  kind: "library" | "registry" | "service" | "reference" | "platform";
  install?: string;
  quality: number;
  speed: number;
  cost: number;
  performance: number;
  openness: number;
  notes: string;
};

const engines: Engine[] = [
  { engine:"shadcn", domain:"ui", capabilities:["component","design-system"], frameworks:["react","any"], kind:"registry", quality:9,speed:9,cost:10,performance:9,openness:10,notes:"Composable source-first UI foundation." },
  { engine:"react-bits", domain:"ui", capabilities:["component","design-system","effects"], frameworks:["react","phaser-overlay","any"], kind:"registry", quality:9,speed:10,cost:9,performance:8,openness:9,notes:"Premium React effects/components; use official registries and respect Pro licensing." },
  { engine:"kokonutui", domain:"ui", capabilities:["component","design-system"], frameworks:["react","any"], kind:"registry", quality:9,speed:9,cost:9,performance:8,openness:8,notes:"Agent-friendly React UI component source/registry." },
  { engine:"animejs", domain:"motion", capabilities:["micro-interaction","timeline","smooth-scroll"], frameworks:["react","vanilla","vue","phaser-overlay","any"], kind:"library", install:"npm install animejs", quality:9,speed:9,cost:10,performance:9,openness:10,notes:"Lightweight DOM/CSS/SVG/JS choreography and timelines." },
  { engine:"motion", domain:"motion", capabilities:["micro-interaction","timeline","smooth-scroll"], frameworks:["react","vanilla","vue","phaser-overlay","any"], kind:"library", install:"npm install motion", quality:9,speed:9,cost:10,performance:9,openness:10,notes:"Strong React/layout/gesture/scroll animation engine." },
  { engine:"gsap", domain:"motion", capabilities:["micro-interaction","timeline","smooth-scroll"], frameworks:["react","vanilla","vue","phaser-overlay","any"], kind:"library", install:"npm install gsap", quality:10,speed:8,cost:9,performance:9,openness:7,notes:"High-control cinematic timeline and scroll choreography." },
  { engine:"lenis", domain:"motion", capabilities:["smooth-scroll"], frameworks:["react","vanilla","vue","any"], kind:"library", install:"npm install lenis", quality:9,speed:9,cost:10,performance:9,openness:10,notes:"Smooth-scroll engine suited to DOM/WebGL synchronization." },
  { engine:"threejs", domain:"3d", capabilities:["web-3d","interactive-3d"], frameworks:["react","vanilla","any"], kind:"library", install:"npm install three", quality:10,speed:7,cost:10,performance:9,openness:10,notes:"General-purpose WebGL/WebGPU 3D runtime." },
  { engine:"spline", domain:"3d", capabilities:["web-3d","interactive-3d"], frameworks:["react","vanilla","any"], kind:"service", quality:9,speed:10,cost:7,performance:7,openness:5,notes:"Visual interactive 3D authoring and publishing platform." },
  { engine:"webgpu", domain:"shader", capabilities:["webgpu","webgl-shader"], frameworks:["react","vanilla","any"], kind:"library", quality:10,speed:5,cost:10,performance:10,openness:10,notes:"Native browser GPU capability for advanced rendering/compute; requires capability detection and fallback." },
  { engine:"threejs", domain:"shader", capabilities:["webgl-shader","webgpu"], frameworks:["react","vanilla","any"], kind:"library", install:"npm install three", quality:9,speed:8,cost:10,performance:9,openness:10,notes:"Practical shader integration through Three.js materials/renderers." },
  { engine:"jitter", domain:"video", capabilities:["motion-design","web-animation"], frameworks:["any"], kind:"service", quality:9,speed:9,cost:7,performance:7,openness:4,notes:"Motion-design production service; export assets rather than gateway dependency." },
  { engine:"rive", domain:"video", capabilities:["web-animation","motion-design"], frameworks:["react","vanilla","any"], kind:"library", install:"npm install @rive-app/webgl2", quality:10,speed:8,cost:8,performance:9,openness:9,notes:"Interactive vector animation runtime suitable for product UI and game-like experiences." },
  { engine:"godly", domain:"design-reference", capabilities:["award-inspiration","design-guidance"], frameworks:["any"], kind:"reference", quality:10,speed:8,cost:10,performance:5,openness:8,notes:"Use as inspiration/reference, never copy protected designs wholesale." },
  { engine:"impeccable", domain:"design-reference", capabilities:["design-guidance"], frameworks:["any"], kind:"reference", quality:9,speed:9,cost:10,performance:6,openness:8,notes:"Design-quality guidance layer." },
  { engine:"manus", domain:"agent-platform", capabilities:["agent-builder"], frameworks:["any"], kind:"platform", quality:8,speed:8,cost:6,performance:6,openness:4,notes:"External agent platform; connection requires its supported auth/API surface." },
  { engine:"21st", domain:"agent-platform", capabilities:["agent-ui-builder"], frameworks:["react","any"], kind:"platform", quality:9,speed:9,cost:7,performance:7,openness:6,notes:"AI-oriented UI/component creation platform; use supported integration surface." },
];

function score(e: Engine, p: BuildPreference) {
  if (p === "quality") return e.quality*.6+e.performance*.15+e.speed*.1+e.cost*.05+e.openness*.1;
  if (p === "speed") return e.speed*.6+e.quality*.2+e.performance*.1+e.cost*.05+e.openness*.05;
  if (p === "cost") return e.cost*.6+e.openness*.15+e.quality*.15+e.speed*.1;
  if (p === "performance") return e.performance*.6+e.quality*.2+e.speed*.1+e.openness*.1;
  if (p === "open-source") return e.openness*.6+e.cost*.15+e.quality*.15+e.performance*.1;
  return e.quality*.3+e.speed*.2+e.cost*.15+e.performance*.2+e.openness*.15;
}

export function routeBuild(request:{domain:BuildDomain; capability:string; preference?:BuildPreference; framework?:BuildFramework}) {
  const preference=request.preference??"balanced"; const framework=request.framework??"any";
  const ranked=engines.filter(e=>e.domain===request.domain&&e.capabilities.includes(request.capability)).filter(e=>framework==="any"||e.frameworks.includes(framework)||e.frameworks.includes("any")).map(e=>({...e,score:Number(score(e,preference).toFixed(2))})).sort((a,b)=>b.score-a.score);
  return {domain:request.domain,capability:request.capability,preference,framework,selected:ranked[0]??null,alternatives:ranked.slice(1)};
}
export function buildRoutingMatrix(){return engines;}

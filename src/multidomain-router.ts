export type Domain = "ui" | "motion" | "3d" | "shader" | "video" | "audio" | "backend" | "data" | "storage" | "auth" | "testing" | "deployment" | "commerce" | "observability" | "design-reference" | "agent-platform";
export type Preference = "quality" | "speed" | "cost" | "bundle" | "open-source" | "balanced";

export type MultiDomainRequest = {
  domain: Domain;
  capability?: string;
  preference?: Preference;
  framework?: "react" | "vanilla" | "vue" | "phaser" | "three" | "node" | "python" | "expo" | "any";
  requireInstallable?: boolean;
};

type Engine = {
  id: string;
  domains: Domain[];
  capabilities: string[];
  frameworks: string[];
  install?: string;
  connect?: string;
  quality: number;
  speed: number;
  cost: number;
  bundle: number;
  openSource: number;
  status: "installable" | "registry" | "service" | "reference" | "verify";
  notes: string;
};

const engines: Engine[] = [
  { id:"css", domains:["ui","motion"], capabilities:["micro-interaction","transition","keyframes","layout"], frameworks:["any"], quality:7,speed:10,cost:10,bundle:10,openSource:10,status:"installable",notes:"Zero-dependency default for simple motion and presentation." },
  { id:"animejs", domains:["motion","ui"], capabilities:["timeline","svg","dom","js-object","drag","scroll","game-hud","game-menu"], frameworks:["react","vanilla","vue","phaser","any"], install:"npm install animejs", quality:9,speed:9,cost:10,bundle:9,openSource:10,status:"installable",notes:"Lightweight general-purpose choreography." },
  { id:"motion", domains:["motion","ui"], capabilities:["react-animation","layout","gesture","drag","scroll","svg","webgl","micro-interaction"], frameworks:["react","vanilla","vue","any"], install:"npm install motion", quality:9,speed:9,cost:10,bundle:8,openSource:10,status:"installable",notes:"Strong React/layout/gesture and hybrid browser animation engine." },
  { id:"gsap", domains:["motion","ui"], capabilities:["timeline","scroll","scrub","pin","snap","svg","cinematic"], frameworks:["react","vanilla","vue","phaser","any"], install:"npm install gsap", quality:10,speed:8,cost:9,bundle:6,openSource:7,status:"installable",notes:"High-control cinematic choreography and complex timelines." },
  { id:"lenis", domains:["motion","ui"], capabilities:["smooth-scroll","scroll-sync","webgl-scroll"], frameworks:["react","vanilla","vue","any"], install:"npm install lenis", quality:9,speed:9,cost:10,bundle:9,openSource:10,status:"installable",notes:"Smooth scrolling and render-loop synchronization." },
  { id:"threejs", domains:["3d","shader"], capabilities:["scene","webgl","webgpu","gltf","postprocessing","shader","game-3d"], frameworks:["vanilla","three","react","any"], install:"npm install three", quality:10,speed:8,cost:10,bundle:7,openSource:10,status:"installable",notes:"Primary programmable browser 3D/WebGL/WebGPU engine." },
  { id:"rive", domains:["motion","ui"], capabilities:["interactive-vector","state-machine","runtime-animation","game-ui"], frameworks:["react","vanilla","any"], install:"npm install @rive-app/webgl2", quality:10,speed:8,cost:9,bundle:5,openSource:10,status:"installable",notes:"Interactive authored vector animation with web runtime and state machines." },
  { id:"react-bits", domains:["ui","motion"], capabilities:["component","effect","background","text-animation"], frameworks:["react"], connect:"official shadcn registry @react-bits", quality:9,speed:10,cost:10,bundle:8,openSource:10,status:"registry",notes:"Install from official registry; do not mirror Pro source." },
  { id:"kokonutui", domains:["ui"], capabilities:["component","layout","interaction"], frameworks:["react"], connect:"official registry/workflow", quality:9,speed:10,cost:9,bundle:8,openSource:8,status:"registry",notes:"Agent-friendly component source; use official distribution." },
  { id:"shadcn", domains:["ui"], capabilities:["component","primitive","app-ui"], frameworks:["react"], connect:"shadcn CLI/registry", quality:9,speed:10,cost:10,bundle:9,openSource:10,status:"registry",notes:"Foundation registry for composable UI installation." },
  { id:"spline", domains:["3d","design-reference"], capabilities:["scene","interactive-3d","web-embed","3d-design"], frameworks:["react","vanilla","any"], connect:"Spline export/embed/runtime", quality:10,speed:9,cost:6,bundle:6,openSource:3,status:"service",notes:"Visual interactive 3D authoring and publishing." },
  { id:"shadergradient", domains:["shader","3d","ui"], capabilities:["gradient","shader-background","webgl-effect"], frameworks:["react","any"], quality:9,speed:9,cost:7,bundle:6,openSource:5,status:"service",notes:"Shader-driven visual surfaces; exact project integration should be verified per target." },
  { id:"webgpu", domains:["shader","3d"], capabilities:["gpu-compute","renderer","shader","high-performance-graphics"], frameworks:["vanilla","three","any"], quality:10,speed:7,cost:10,bundle:10,openSource:10,status:"installable",notes:"Browser platform capability rather than a package; route through Three.js or direct WebGPU when justified." },
  { id:"jitter", domains:["video","motion"], capabilities:["motion-design","video","social-animation"], frameworks:["any"], quality:9,speed:9,cost:6,bundle:10,openSource:2,status:"service",notes:"Authored motion/video service; connect/export rather than vendor source." },
  { id:"autoae", domains:["video","motion"], capabilities:["after-effects","template-animation","video"], frameworks:["any"], quality:8,speed:8,cost:6,bundle:10,openSource:2,status:"verify",notes:"External video/motion workflow; API/automation contract must be verified before adapter work." },
  { id:"elevenlabs", domains:["audio","video","agent-platform"], capabilities:["speech","voice","sound-effects","music","audio-generation","conversational-agent"], frameworks:["any"], connect:"ElevenLabs hosted MCP/API", quality:10,speed:9,cost:5,bundle:10,openSource:1,status:"service",notes:"Remote media engine; billable calls remain behind Game Shop spend policy." },
  { id:"cloudinary", domains:["storage","video","audio","ui"], capabilities:["asset-upload","asset-delivery","image-transform","video-transform","optimization","cdn"], frameworks:["any"], connect:"Cloudinary API", quality:9,speed:9,cost:6,bundle:10,openSource:1,status:"service",notes:"Managed asset lifecycle and delivery layer." },
  { id:"supabase", domains:["backend","data","storage","auth"], capabilities:["postgres","database","object-storage","authentication","realtime","edge-functions","vector"], frameworks:["react","node","expo","any"], connect:"Supabase platform/API", quality:9,speed:9,cost:8,bundle:8,openSource:9,status:"service",notes:"Preferred durable Game Shop state backend when dedicated project credentials are configured." },
  { id:"vercel", domains:["deployment","observability","backend"], capabilities:["preview","deploy","production-deploy","serverless","logs","domains","edge"], frameworks:["react","node","any"], connect:"Vercel Git integration/API", quality:9,speed:10,cost:8,bundle:10,openSource:3,status:"service",notes:"Preview-first deployment adapter; production remains separately gated." },
  { id:"playwright", domains:["testing"], capabilities:["browser-test","regression","interaction","screenshot","console","network","accessibility"], frameworks:["any"], install:"npx @playwright/mcp@latest", quality:10,speed:8,cost:10,bundle:7,openSource:10,status:"installable",notes:"Deterministic and MCP browser verification lane." },
  { id:"browserbase", domains:["testing","agent-platform"], capabilities:["browser-session","exploration","visual-review","computer-use","extract","act"], frameworks:["any"], connect:"Browserbase hosted MCP/API", quality:9,speed:9,cost:5,bundle:10,openSource:5,status:"service",notes:"Hosted exploratory browser lane; use independent deterministic QA before release." },
  { id:"chrome-devtools-mcp", domains:["testing","observability"], capabilities:["performance","console","network","lighthouse","trace","runtime-debugging"], frameworks:["any"], install:"npx -y chrome-devtools-mcp@latest", quality:10,speed:8,cost:10,bundle:8,openSource:10,status:"installable",notes:"Deep Chrome diagnostics and performance evidence lane." },
  { id:"stripe", domains:["commerce","backend"], capabilities:["payments","subscriptions","checkout","billing","webhooks","products","prices"], frameworks:["react","node","any"], connect:"Stripe API", quality:10,speed:9,cost:8,bundle:10,openSource:2,status:"service",notes:"Commerce infrastructure; mutations require explicit product/payment intent and credentials." },
  { id:"github", domains:["deployment","agent-platform"], capabilities:["source-control","branch","pull-request","workflow","release","code-review"], frameworks:["any"], connect:"GitHub API", quality:10,speed:9,cost:10,bundle:10,openSource:10,status:"service",notes:"Primary source-of-truth and controlled mutation plane." },
  { id:"godly", domains:["design-reference"], capabilities:["web-inspiration","interaction-reference","visual-reference"], frameworks:["any"], quality:10,speed:8,cost:10,bundle:10,openSource:10,status:"reference",notes:"Reference/inspiration source, not a runtime dependency." },
  { id:"impeccable", domains:["design-reference","ui","testing"], capabilities:["design-guidance","visual-polish","critique","design-audit","ui-verification"], frameworks:["any"], install:"npx impeccable install", quality:9,speed:9,cost:9,bundle:10,openSource:7,status:"installable",notes:"Deterministic design-quality verification plus agent guidance." },
  { id:"21st-dev", domains:["ui","agent-platform"], capabilities:["component-discovery","agent-ui","component-generation"], frameworks:["react","any"], quality:9,speed:9,cost:7,bundle:8,openSource:6,status:"service",notes:"Agent-oriented UI ecosystem; connect via official supported interfaces only." },
  { id:"manus", domains:["agent-platform"], capabilities:["agent","research","computer-use","build-workflow"], frameworks:["any"], quality:9,speed:8,cost:5,bundle:10,openSource:1,status:"service",notes:"External agent platform; only connect through a verified supported API/MCP interface." },
  { id:"contextcore", domains:["agent-platform","data"], capabilities:["context","agent-context","workflow","local-search","code-search"], frameworks:["any"], quality:7,speed:7,cost:7,bundle:10,openSource:5,status:"service",notes:"Local-first context/search MCP; appropriate for desktop agents rather than Vercel runtime." },
];

function score(e: Engine, p: Preference) {
  if (p === "quality") return e.quality*.65+e.speed*.1+e.cost*.1+e.bundle*.05+e.openSource*.1;
  if (p === "speed") return e.speed*.65+e.quality*.2+e.cost*.05+e.bundle*.05+e.openSource*.05;
  if (p === "cost") return e.cost*.65+e.quality*.15+e.speed*.1+e.bundle*.05+e.openSource*.05;
  if (p === "bundle") return e.bundle*.65+e.speed*.1+e.quality*.15+e.cost*.05+e.openSource*.05;
  if (p === "open-source") return e.openSource*.65+e.quality*.15+e.speed*.1+e.cost*.05+e.bundle*.05;
  return e.quality*.3+e.speed*.2+e.cost*.2+e.bundle*.15+e.openSource*.15;
}

export function routeMultiDomain(request: MultiDomainRequest) {
  const preference=request.preference??"balanced";
  const framework=request.framework??"any";
  const capability=request.capability?.trim().toLowerCase();
  const ranked=engines
    .filter(e=>e.domains.includes(request.domain))
    .filter(e=>!capability||e.capabilities.some(c=>c.includes(capability)||capability.includes(c)))
    .filter(e=>framework==="any"||e.frameworks.includes("any")||e.frameworks.includes(framework))
    .filter(e=>!request.requireInstallable||e.status==="installable"||e.status==="registry")
    .map(e=>({...e,score:Number(score(e,preference).toFixed(2))}))
    .sort((a,b)=>b.score-a.score);
  return {domain:request.domain,capability:capability??null,preference,framework,selected:ranked[0]??null,alternatives:ranked.slice(1)};
}

export function multiDomainMatrix(domain?: Domain) { return domain ? engines.filter(e=>e.domains.includes(domain)) : engines; }

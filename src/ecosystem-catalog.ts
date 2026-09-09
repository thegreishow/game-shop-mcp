export type EcosystemSurface = "mcp" | "api" | "library" | "registry" | "cli" | "platform-api" | "reference";
export type EcosystemStatus = "integrated" | "verified" | "installable" | "reference" | "research";
export type EcosystemEntry = {name:string;status:EcosystemStatus;surfaces:EcosystemSurface[];install?:string;endpoint?:string;capabilities:string[];notes?:string};

// Catalog derived from the user's Game Shop research list. Entries are deliberately
// conservative: a product is not labeled MCP/API unless an official programmable
// surface has been verified. Reference-only products stay available for design research.
const entries:EcosystemEntry[] = [
{name:"Motion",status:"verified",surfaces:["mcp","library","cli"],install:"npx motion-ai@latest",capabilities:["react-animation","vanilla-animation","vue-animation","scroll","gestures","layout","threejs-motion","docs-search","motion-score"],notes:"Official AI Kit installs hosted MCP servers; core runtime package is motion."},
{name:"KokonutUI",status:"integrated",surfaces:["mcp","registry","cli"],capabilities:["react-ui","motion-components","shadcn-registry"]},
{name:"Manus",status:"integrated",surfaces:["api","mcp","cli"],capabilities:["agent-tasks","projects","files","webhooks","custom-tools"]},
{name:"WanGP / Wan2GP",status:"integrated",surfaces:["mcp","api","cli"],capabilities:["local-video-generation","model-discovery","session-reuse"]},
{name:"Podium",status:"integrated",surfaces:["api"],capabilities:["commerce","orders","payments","campaigns","webhooks"]},
{name:"Lenis",status:"integrated",surfaces:["library"],install:"npm install lenis",capabilities:["smooth-scroll","scroll-sync","webgl-scroll"]},
{name:"Rive",status:"integrated",surfaces:["library","api"],install:"npm install @rive-app/webgl2",capabilities:["interactive-animation","state-machines","webgl2","runtime-interactivity"]},
{name:"Spline",status:"integrated",surfaces:["mcp","api"],capabilities:["scene-editing","3d-generation","scene-code-api","realtime-api"]},
{name:"Unison",status:"integrated",surfaces:["mcp","api","cli"],capabilities:["project-memory","context-recall","knowledge-graph"]},
{name:"21st.dev",status:"integrated",surfaces:["mcp","cli","registry"],endpoint:"https://21st.dev/api/mcp",capabilities:["component-search","component-install","ui-generation","templates"]},
{name:"MotionSites AI",status:"integrated",surfaces:["mcp"],capabilities:["website-design-prompts","design-reference"]},
{name:"Raylight",status:"integrated",surfaces:["mcp"],endpoint:"https://api.raylight.app/mcp",capabilities:["shot-editing","animation-editing","render-frames","visual-review"]},
{name:"GSAP",status:"integrated",surfaces:["library"],install:"npm install gsap",capabilities:["timeline","scroll","svg","cinematic-motion"]},
{name:"HorizonX",status:"integrated",surfaces:["reference"],capabilities:["ui-kits","figma","templates","design-systems"]},
{name:"Chatterbox",status:"integrated",surfaces:["library","cli"],install:"pip install chatterbox-tts",capabilities:["tts","voice-cloning","voice-conversion"]},
{name:"Jitter",status:"integrated",surfaces:["reference"],capabilities:["motion-design","timeline-animation","video-export"]},
{name:"Skiper UI",status:"integrated",surfaces:["registry","cli"],capabilities:["animated-components","shadcn-registry"]},
{name:"Vengeance UI",status:"integrated",surfaces:["registry","cli"],capabilities:["animated-components","shader-ui","interactive-ui"]},
{name:"Three.js",status:"integrated",surfaces:["library"],install:"npm install three",capabilities:["webgl","webgpu","gltf","shaders","postprocessing"]},
{name:"ShaderGradient",status:"integrated",surfaces:["library"],capabilities:["animated-gradients","react-three-fiber","webgl"]},
{name:"Magic UI",status:"integrated",surfaces:["mcp","cli","registry"],capabilities:["component-search","component-source","templates","animated-ui"]},
{name:"daisyUI",status:"verified",surfaces:["mcp","library"],install:"npx -y daisyui-blueprint@latest",capabilities:["component-guidance","theme-guidance","code-generation","figma-to-code"],notes:"Official Blueprint MCP is the recommended daisyUI integration; license/email required."},
{name:"HeroUI",status:"integrated",surfaces:["mcp","cli","library"],install:"npx -y @heroui/react-mcp@latest",capabilities:["react-components","native-components","docs","install","doctor"]},
{name:"Animate UI",status:"integrated",surfaces:["mcp","registry","cli"],capabilities:["animated-components","motion-ui"]},
{name:"Cult UI",status:"integrated",surfaces:["mcp","registry","cli"],capabilities:["component-search","motion-ui"]},
{name:"Preline UI",status:"integrated",surfaces:["mcp","cli","registry"],capabilities:["component-docs","blocks","themes"]},
{name:"Kibo UI",status:"integrated",surfaces:["mcp","cli","registry"],capabilities:["component-docs","component-install","shadcn-components"]},
{name:"Impeccable",status:"integrated",surfaces:["cli"],capabilities:["design-audit","critique","polish","ui-verification"]},
{name:"SmoothUI",status:"integrated",surfaces:["registry","reference"],capabilities:["animated-react-components","motion","gsap"]},
{name:"Unlumen UI",status:"integrated",surfaces:["registry","reference"],capabilities:["react-components","motion-ui"]},
{name:"Anime.js",status:"integrated",surfaces:["library"],install:"npm install animejs@4.5.0",capabilities:["timeline","dom-animation","svg-animation","js-object-animation","stagger","draggable","scroll","waapi"],notes:"Installed in Game Shop MCP and smoke-tested."},
{name:"shadcn/ui",status:"verified",surfaces:["mcp","registry","cli"],install:"npx shadcn@latest mcp",capabilities:["registry-browse","registry-search","component-install","multi-registry"],notes:"Official MCP works with shadcn-compatible registries."},
{name:"WebGPU",status:"verified",surfaces:["platform-api"],capabilities:["gpu-rendering","compute","shader-pipelines","high-performance-graphics"],notes:"Browser platform API, not a remote MCP."},
{name:"Headless UI",status:"installable",surfaces:["library"],install:"npm install @headlessui/react",capabilities:["accessible-primitives","dialogs","menus","listboxes","transitions"]},
{name:"dashersw/liquid-glass-js",status:"installable",surfaces:["library"],capabilities:["webgl-glass","refraction","blur","masking"],notes:"MIT GitHub library; no official npm release or MCP verified."},
{name:"Origin UI / OriginKit",status:"verified",surfaces:["mcp","api","registry","cli"],endpoint:"https://mcp.originkit.dev/mcp",install:"npx @originkit/cli",capabilities:["component-list","component-source","search","fetch","stack-adaptation"],notes:"Official hosted MCP plus registry API at mcp.originkit.dev/v1."},
{name:"Motion Primitives",status:"installable",surfaces:["library","reference"],capabilities:["motion-components","react-ui","templates","sections"],notes:"Core components are usable; Pro source is licensed and must not be mirrored."},
{name:"Shaders.com",status:"verified",surfaces:["mcp","api","library","registry"],endpoint:"https://shaders.com/mcp",install:"npm install shaders",capabilities:["shader-install","shader-edit","webgpu-effects","javascript-api","shadcn-registry"],notes:"Official MCP with OAuth/API-key auth plus JavaScript API and shadcn registry."},
{name:"LogoAI",status:"verified",surfaces:["api","reference"],endpoint:"https://legacy.logoai.com/logo-api",capabilities:["logo-generation","logo-customization","brand-assets","iframe-integration"],notes:"Official commercial Logo API exists but requires partner approval; not self-serve."},
{name:"Mosaic Motion / Motion.so",status:"verified",surfaces:["mcp","api"],endpoint:"https://mcp.motion.so/mcp",capabilities:["prompt-to-video","session-create","session-poll","followup","design-systems","style-references","attachments","source-audit"],notes:"Official OAuth 2.1 MCP plus REST API at api.motion.so/api/motion. Paid generation credits apply."},
{name:"Bklit UI",status:"installable",surfaces:["registry","cli"],install:"npx skills add bklit/bklit-ui",capabilities:["charts","data-visualization","shadcn-registry","animated-charts"],notes:"MIT @bklit shadcn registry at ui.bklit.com/r/{name}.json; can be browsed through shadcn MCP after registry configuration."},
{name:"ContextCore",status:"verified",surfaces:["mcp","cli"],install:"python -m pip install contextcore",capabilities:["local-file-index","hybrid-search","code-context","image-search","audio-search","video-search"],notes:"Local-first AGPL MCP with local backend, normally 127.0.0.1:8000. Suitable for desktop/local agents rather than Vercel-hosted execution."},
{name:"Godly",status:"reference",surfaces:["reference"],capabilities:["web-design-inspiration"]},
{name:"Animos",status:"research",surfaces:["reference"],capabilities:["animation-tooling"],notes:"Programmable surface not yet verified."},
{name:"AutoAE",status:"research",surfaces:["reference"],capabilities:["motion-video"],notes:"No public developer API/MCP contract verified."},
{name:"Animaster LIB",status:"research",surfaces:["reference"],capabilities:["animation-library"],notes:"Exact project/source needs verification."},
{name:"Vibify",status:"research",surfaces:["reference"],capabilities:["ui-motion"],notes:"Programmable surface not yet verified."},
{name:"Liquid Logo",status:"research",surfaces:["reference"],capabilities:["logo-motion"],notes:"Exact project/source needs verification."},
{name:"gitdesign.MD",status:"research",surfaces:["reference"],capabilities:["design-context"],notes:"Exact project/source needs verification."},
{name:"Awesome Design",status:"reference",surfaces:["reference"],capabilities:["design-resources"]},
{name:"The Odin Project",status:"reference",surfaces:["reference"],capabilities:["learning-reference"]},
{name:"Compoentry",status:"research",surfaces:["reference"],capabilities:["component-reference"],notes:"Programmable surface not yet verified."},
{name:"is.graphics",status:"research",surfaces:["reference"],capabilities:["graphics-reference"],notes:"Programmable surface not yet verified."},
{name:"SkeuDesign",status:"reference",surfaces:["reference"],capabilities:["skeuomorphic-design-reference"]},
];

export function ecosystemCatalog(){
  const counts=entries.reduce<Record<EcosystemStatus,number>>((acc,e)=>{acc[e.status]++;return acc;},{integrated:0,verified:0,installable:0,reference:0,research:0});
  return {source:"The Game Shop MCP research list",count:entries.length,counts,entries};
}

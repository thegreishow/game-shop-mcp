import { routeMultiDomain, type Preference } from "./multidomain-router.js";

export type AppWorkflowPhase="create"|"upgrade"|"fix"|"audit"|"release";
export type AppKind="auto"|"mobile"|"web-app"|"desktop"|"hybrid"|"marketplace"|"internal-tool";
export type AppFramework="auto"|"expo"|"react"|"web"|"any";
export type AppNeed="ui"|"navigation"|"state"|"data"|"auth"|"backend"|"payments"|"notifications"|"location"|"camera"|"offline"|"native-modules"|"deep-links"|"analytics"|"observability"|"testing"|"deployment";

export type AppWorkflowRequest={brief:string;phase?:AppWorkflowPhase;kind?:AppKind;framework?:AppFramework;needs?:AppNeed[];preference?:Preference;existingProject?:boolean};
type Stage={order:number;lane:string;owner:string;purpose:string;gate?:string;transport?:string};

const defaults:Record<Exclude<AppKind,"auto">,AppNeed[]>={
 mobile:["ui","navigation","state","data","auth","backend","notifications","offline","testing","deployment"],
 "web-app":["ui","navigation","state","data","auth","backend","analytics","observability","testing","deployment"],
 desktop:["ui","navigation","state","data","testing","deployment"],
 hybrid:["ui","navigation","state","data","auth","backend","notifications","offline","testing","deployment"],
 marketplace:["ui","navigation","state","data","auth","backend","payments","notifications","location","analytics","observability","testing","deployment"],
 "internal-tool":["ui","navigation","state","data","auth","backend","observability","testing","deployment"],
};

function unique<T>(items:T[]){return [...new Set(items)];}
function inferKind(request:AppWorkflowRequest):Exclude<AppKind,"auto">{
 if(request.kind&&request.kind!=="auto")return request.kind;
 const n=new Set(request.needs??[]);
 if(n.has("payments")&&n.has("location"))return"marketplace";
 if(n.has("native-modules")||n.has("camera")||n.has("notifications")||request.framework==="expo")return"mobile";
 if(n.has("backend")||n.has("auth")||n.has("data"))return"web-app";
 return"web-app";
}
function add(stages:Stage[],owner:string,purpose:string,gate?:string,transport?:string){stages.push({order:stages.length+1,lane:owner,owner,purpose,...(gate?{gate}:{}),...(transport?{transport}:{})});}
function route(domain:Parameters<typeof routeMultiDomain>[0]["domain"],capability:string|undefined,preference:Preference,framework:Parameters<typeof routeMultiDomain>[0]["framework"]="any"){
 return routeMultiDomain({domain,capability,preference,framework}).selected;
}

export function routeAppWorkflow(request:AppWorkflowRequest){
 if(!request.brief?.trim())throw new Error("brief is required");
 const phase=request.phase??"upgrade",kind=inferKind(request),preference=request.preference??"balanced";
 const needs=unique([...(defaults[kind]??[]),...(request.needs??[])]);
 const existing=request.existingProject??phase!=="create";
 const framework=request.framework??"auto";
 const multiPlatform=kind==="mobile"||kind==="hybrid"||needs.some(n=>["native-modules","camera","notifications","deep-links"].includes(n));
 const stages:Stage[]=[];const gates:string[]=[];const cautions:string[]=[];
 add(stages,"Game Shop","Load project context, permissions, budget, prior QA and current release posture.","project-context");
 add(stages,"GitHub / project source","Inspect the current codebase and preserve the existing architecture before mutation.",existing?"inspection-before-write":"source-root","source-control");
 if(multiPlatform)add(stages,"Expo / React Native","Own native navigation, device APIs, build profiles and platform-specific implementation.","native-runtime-fit","codex-skill/local-workspace");
 const ui=route("ui","app-ui",preference,framework==="expo"?"expo":framework==="react"?"react":"any");
 if(needs.includes("ui"))add(stages,ui?.id??"UI workspace","Build or repair application surfaces with the smallest component stack that fits the project.","design-system-fit",ui?.status);
 if(needs.includes("backend"))add(stages,(route("backend","serverless",preference,framework==="expo"?"expo":"any")?.id??"Backend"),"Implement server-side business logic only where the product requires it.","server-authorization");
 if(needs.includes("data"))add(stages,(route("data","database",preference,framework==="expo"?"expo":"any")?.id??"Data"),"Load and mutate durable product data through the project-approved data layer.","schema-and-rls");
 if(needs.includes("auth"))add(stages,(route("auth","authentication",preference,framework==="expo"?"expo":"any")?.id??"Auth"),"Use real authentication and server-side authorization rather than client-only role checks.","auth-boundary");
 if(needs.includes("payments"))add(stages,(route("commerce","payments",preference,"any")?.id??"Stripe"),"Handle checkout, payment state and webhook-driven fulfillment.","payment-intent-and-webhook");
 if(needs.some(n=>["notifications","camera","location","offline","native-modules","deep-links"].includes(n)))add(stages,"Native capability lane","Implement device permissions, deep links, offline behavior and native modules behind explicit platform checks.","device-permission-and-fallback","local-workspace");
 if(needs.includes("observability"))add(stages,(route("observability","console",preference,"any")?.id??"Observability"),"Capture runtime, network and performance evidence before claiming the app is stable.","measured-evidence");
 if(needs.includes("testing"))add(stages,(route("testing","browser-test",preference,"any")?.id??"Testing"),"Run deterministic regressions for web surfaces plus platform-specific build validation for native targets.","qa-green");
 if(phase==="release"||needs.includes("deployment")){
   if(multiPlatform)add(stages,"Expo EAS / stores","Create verified native builds; store submission remains an explicit release action.","signed-build-and-release-approval","local-workspace");
   if(kind!=="mobile")add(stages,(route("deployment","preview",preference,"any")?.id??"Deployment"),"Create a preview first, bind QA to the commit, then evaluate production release.","preview-before-production");
 }
 gates.push("Project context and source inspection precede mutation.","Credentials, external execution, writes, paid operations and deployment remain independently gated.","QA evidence must be bound to the target build/commit before release.");
 if(existing)cautions.push("Preserve the current framework unless requirements justify migration.");
 if(!needs.includes("backend"))cautions.push("Do not add a backend merely because one is available.");
 if(!needs.includes("payments"))cautions.push("Do not add Stripe or payment infrastructure without commerce intent.");
 if(multiPlatform)cautions.push("Browser QA alone is insufficient for native behavior; require platform build/runtime validation.");
 return{phase,selectedKind:kind,framework,needs,primaryLane:multiPlatform?"Expo / React Native":"Web application",stages,gates,cautions,policy:{routingIsReadOnly:true,sourceOfTruth:"project registry + project source",previewBeforeRelease:true,noMigrationByAvailability:true}};
}

export function appWorkflowMatrix(){return{version:1,kinds:Object.keys(defaults),defaults,phases:["create","upgrade","fix","audit","release"],frameworks:["auto","expo","react","web","any"],specialists:["Expo / React Native","GitHub","Supabase","Stripe","Playwright","Chrome DevTools","Vercel","Game Shop"],policy:"Use the smallest app stack that satisfies the product. Native/device capabilities route to Expo/workspace lanes; web-app infrastructure remains requirement-driven."};}

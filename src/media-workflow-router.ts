import { routeMultiDomain, type Preference } from "./multidomain-router.js";

export type MediaWorkflowPhase="create"|"upgrade"|"fix"|"audit"|"release";
export type MediaKind="auto"|"music"|"voice"|"video"|"visual"|"social"|"campaign"|"interactive";
export type MediaNeed="audio"|"voice"|"music"|"video"|"image"|"motion"|"captions"|"transcription"|"3d"|"storage"|"delivery"|"social-cutdowns"|"qa";
export type MediaWorkflowRequest={brief:string;phase?:MediaWorkflowPhase;kind?:MediaKind;needs?:MediaNeed[];preference?:Preference;existingProject?:boolean};
type Stage={order:number;lane:string;owner:string;purpose:string;gate?:string;transport?:string};

const defaults:Record<Exclude<MediaKind,"auto">,MediaNeed[]>={
 music:["audio","music","storage","delivery","qa"],
 voice:["audio","voice","storage","delivery","qa"],
 video:["video","audio","motion","captions","storage","delivery","qa"],
 visual:["image","motion","storage","delivery","qa"],
 social:["video","image","motion","captions","social-cutdowns","storage","delivery","qa"],
 campaign:["video","image","audio","motion","captions","social-cutdowns","storage","delivery","qa"],
 interactive:["video","audio","motion","image","storage","delivery","qa"],
};
function unique<T>(items:T[]){return[...new Set(items)];}
function inferKind(request:MediaWorkflowRequest):Exclude<MediaKind,"auto">{if(request.kind&&request.kind!=="auto")return request.kind;const n=new Set(request.needs??[]);if(n.has("voice"))return"voice";if(n.has("music"))return"music";if(n.has("social-cutdowns"))return"social";if(n.has("video"))return"video";if(n.has("image"))return"visual";return"campaign";}
function add(stages:Stage[],owner:string,purpose:string,gate?:string,transport?:string){stages.push({order:stages.length+1,lane:owner,owner,purpose,...(gate?{gate}:{}),...(transport?{transport}:{})});}
function routed(domain:Parameters<typeof routeMultiDomain>[0]["domain"],capability:string|undefined,preference:Preference){return routeMultiDomain({domain,capability,preference,framework:"any"}).selected;}

export function routeMediaWorkflow(request:MediaWorkflowRequest){
 if(!request.brief?.trim())throw new Error("brief is required");
 const phase=request.phase??"create",kind=inferKind(request),preference=request.preference??"balanced",needs=unique([...(defaults[kind]??[]),...(request.needs??[])]),existing=request.existingProject??phase!=="create";
 const stages:Stage[]=[];const gates:string[]=[];const cautions:string[]=[];
 add(stages,"Game Shop","Load project/campaign context, source assets, rights notes, budgets and existing outputs.","asset-and-rights-context");
 if(existing)add(stages,"Source asset inspection","Inspect the exact approved source media before regenerating or replacing it.","preserve-approved-source");
 if(needs.includes("voice")||needs.includes("audio")||needs.includes("music")){const a=routed("audio",needs.includes("voice")?"speech":"audio-generation",preference);add(stages,a?.id??"Audio lane","Generate, transform or prepare audio using the requested media intent.","paid-generation-and-rights",a?.status);}
 if(needs.includes("video")){const v=routed("video","video",preference);add(stages,v?.id??"Video lane","Create or transform video while preserving source timing, aspect and delivery requirements.","paid-generation-and-source-binding",v?.status);}
 if(needs.includes("motion")){const m=routed("motion","cinematic",preference);add(stages,m?.id??"Motion lane","Author motion, titles, transitions and compositing where they materially improve the piece.","motion-fit",m?.status);}
 if(needs.includes("3d")){const t=routed("3d","scene",preference);add(stages,t?.id??"3D lane","Create 3D media only when the brief requires spatial assets or scenes.","3d-runtime-and-cost",t?.status);}
 if(kind==="interactive")add(stages,"Yoroll / interactive media","Package branching, QTE or cinematic interactions as an explicit interactive-media handoff.","credit-confirmation","remote-mcp/client-plugin");
 if(needs.includes("captions")||needs.includes("transcription"))add(stages,"Accessibility / text track lane","Produce captions, transcripts and timing metadata from the approved source.","human-readable-verification");
 if(needs.includes("social-cutdowns"))add(stages,"Social derivative lane","Create channel-specific crops and cutdowns from the approved master without silently altering the master.","master-derivative-separation");
 if(needs.includes("storage")||needs.includes("delivery")){const s=routed("storage","asset-delivery",preference);add(stages,s?.id??"Media delivery","Persist versioned masters and derivatives, then deliver through the configured media/CDN path.","versioned-artifact",s?.status);}
 if(needs.includes("qa"))add(stages,"Media QA","Verify duration, dimensions, loudness/basic playback, captions, file integrity and requested visual/audio properties before release.","qa-green");
 if(phase==="release")add(stages,"Release governance","Approve the exact master/derivatives for release; publishing remains separately authorized.","release-approval");
 gates.push("Paid generation remains disabled unless separately authorized.","Source assets and generated derivatives must remain traceable as distinct artifacts.","Ambiguous provider submission failures must never be blindly retried on another billable provider.","Release requires QA evidence tied to the exact media artifacts.");
 if(existing)cautions.push("Do not regenerate approved source media just because a generative provider is available.");
 if(!needs.includes("3d"))cautions.push("Do not introduce 3D tooling unless the brief specifically needs it.");
 return{phase,selectedKind:kind,needs,primaryLane:kind==="interactive"?"Interactive media":"Media production",stages,gates,cautions,policy:{routingIsReadOnly:true,paidGenerationDefault:"blocked",sourceTraceability:true,artifactVersioning:true}};
}

export function mediaWorkflowMatrix(){return{version:1,kinds:Object.keys(defaults),defaults,phases:["create","upgrade","fix","audit","release"],specialists:["ElevenLabs","Cloudinary","Jitter","Yoroll","motion/GSAP","Three.js","Game Shop"],policy:"Preserve approved masters, route only required media capabilities, keep billable generation independently gated, and bind QA to exact versioned outputs."};}

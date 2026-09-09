import { integrationRegistry } from "./integrations.js";

const REGISTRY="https://registry.modelcontextprotocol.io/v0.1/servers";
export type DiscoveryCandidate={name:string;version?:string;description?:string;repository?:string;score:number;matched:string[];source:"official-mcp-registry"};
function words(value:string){return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2))];}
export function discoveryInfo(){return{source:"official-mcp-registry",endpoint:REGISTRY,mode:"advisory",autoInstall:false,policy:"Discover and score candidates automatically; verification and installation remain explicit."};}
export async function discoverCapabilities(input:{query:string;limit?:number}){
 const q=words(input.query);const url=new URL(REGISTRY);url.searchParams.set("search",input.query);url.searchParams.set("limit",String(Math.min(50,input.limit??20)));
 const response=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`MCP Registry discovery failed (${response.status}).`);const body=await response.json() as Record<string,unknown>;const raw=Array.isArray(body.servers)?body.servers:Array.isArray(body.data)?body.data:[];
 const known=new Set(integrationRegistry().map(i=>i.name.toLowerCase()));const candidates:DiscoveryCandidate[]=[];
 for(const item of raw){if(!item||typeof item!=="object")continue;const r=item as Record<string,unknown>;const server=(r.server&&typeof r.server==="object"?r.server:r) as Record<string,unknown>;const name=String(server.name??"");if(!name||known.has(name.toLowerCase()))continue;const description=String(server.description??"");const hay=`${name} ${description}`.toLowerCase();const matched=q.filter(w=>hay.includes(w));candidates.push({name,version:server.version?String(server.version):undefined,description:description||undefined,repository:typeof server.repository==="string"?server.repository:undefined,score:matched.length,matched,source:"official-mcp-registry"});}
 return{query:input.query,candidates:candidates.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,input.limit??20),policy:discoveryInfo()};
}

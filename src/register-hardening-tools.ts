import { z } from 'zod';
import { arcadeRegistryInfo, refreshArcadeRegistry } from './arcade-registry.js';
import { integrationPolicyInfo } from './integration-policy.js';
import { operationPolicy } from './operation-policy.js';
import { projectContext } from './projects.js';

function result(data:unknown){return{content:[{type:'text' as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==='object'&&data!==null?data as Record<string,unknown>:{value:data}};}
function fail(e:unknown){return{isError:true,content:[{type:'text' as const,text:`Game Shop request failed: ${e instanceof Error?e.message:String(e)}`}]};}
function safe(fn:(input:any)=>unknown|Promise<unknown>){return async(input:any)=>{try{return result(await fn(input));}catch(e){return fail(e);}};}

export function registerHardeningTools(server:any){
  server.registerTool('gameshop_arcade_registry',{title:'Arcade Registry',description:'Refresh/read the authoritative arcade/games/games.json registry and generated MCP project overlays.',inputSchema:z.object({force:z.boolean().optional()}),annotations:{readOnlyHint:true,openWorldHint:true}},safe(async({force}:any)=>({registry:await refreshArcadeRegistry({force}),info:arcadeRegistryInfo()})));
  server.registerTool('gameshop_arcade_project_context',{title:'Arcade Project Context',description:'Refresh the shared arcade registry, then return MCP project context generated from that registry.',inputSchema:z.object({projectId:z.string().min(1).max(100),force:z.boolean().optional()}),annotations:{readOnlyHint:true,openWorldHint:true}},safe(async({projectId,force}:any)=>{await refreshArcadeRegistry({force});return projectContext(projectId);}));
  server.registerTool('gameshop_operation_policy',{title:'Operation Permission Model',description:'Show explicit read/generate/write/destructive/deploy gates and defaults.',inputSchema:z.object({}),annotations:{readOnlyHint:true}},safe(async()=>operationPolicy()));
  server.registerTool('gameshop_integration_operation_policy',{title:'External Integration Allowlist Policy',description:'Show default-deny MCP/REST integration operation and billing policy.',inputSchema:z.object({}),annotations:{readOnlyHint:true}},safe(async()=>integrationPolicyInfo()));
}

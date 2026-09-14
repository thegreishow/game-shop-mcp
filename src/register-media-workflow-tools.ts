import { z } from "zod";
import { publicErrorMessage } from "./errors.js";
import { mediaWorkflowMatrix, routeMediaWorkflow } from "./media-workflow-router.js";

function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}};}
function fail(error:unknown){return{isError:true,content:[{type:"text" as const,text:publicErrorMessage(error)}]};}
const phase=z.enum(["create","upgrade","fix","audit","release"]);
const kind=z.enum(["auto","music","voice","video","visual","social","campaign","interactive"]);
const preference=z.enum(["quality","speed","cost","bundle","open-source","balanced"]);
const need=z.enum(["audio","voice","music","video","image","motion","captions","transcription","3d","storage","delivery","social-cutdowns","qa"]);
export function registerMediaWorkflowTools(server:any){
 server.registerTool("gameshop_route_media_workflow",{title:"Route Media Production Workflow",description:"Route music, voice, video, visual, social, campaign and interactive media through generation, motion, storage, delivery and QA lanes while preserving source/master traceability. Read-only routing never authorizes paid generation or publishing.",inputSchema:z.object({brief:z.string().min(3).max(4000),phase:phase.optional(),kind:kind.optional(),needs:z.array(need).max(13).optional(),preference:preference.optional(),existingProject:z.boolean().optional()}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async(input:unknown)=>{try{return result(routeMediaWorkflow(input as Parameters<typeof routeMediaWorkflow>[0]));}catch(error){return fail(error);}});
 server.registerTool("gameshop_media_workflow_matrix",{title:"Media Production Routing Matrix",description:"Inspect Game Shop media types, default needs, specialist routing, generation gates and release policy.",inputSchema:z.object({}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async()=>result(mediaWorkflowMatrix()));
}

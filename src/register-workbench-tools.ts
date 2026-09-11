import { z } from "zod";
import { publicErrorMessage } from "./errors.js";
import { buildWorkbenchMission } from "./workbench.js";

function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}};}
function fail(error:unknown){return{isError:true,content:[{type:"text" as const,text:publicErrorMessage(error)}]};}
function safe(fn:(input:any)=>unknown|Promise<unknown>){return async(input:any)=>{try{return result(await fn(input));}catch(error){return fail(error);}};}

export function registerWorkbenchTools(server:any){
  server.registerTool("gameshop_workbench",{
    title:"Game Shop Workbench",
    description:"Turn a plain-English project goal into a project-aware sequence of the best available Game Shop engines, with primary/fallback choices, local-vs-cloud execution guidance and blockers.",
    inputSchema:z.object({
      goal:z.string().min(3).max(3000),
      projectId:z.string().min(1).max(100).optional(),
      preference:z.enum(["quality","speed","cost","balanced"]).optional(),
      maxCandidatesPerLane:z.number().int().min(1).max(5).optional(),
    }),
    annotations:{readOnlyHint:true},
  },safe(buildWorkbenchMission));
}

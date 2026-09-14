import { z } from "zod";
import { publicErrorMessage } from "./errors.js";
import { appWorkflowMatrix, routeAppWorkflow } from "./app-workflow-router.js";

function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}};}
function fail(error:unknown){return{isError:true,content:[{type:"text" as const,text:publicErrorMessage(error)}]};}
const phase=z.enum(["create","upgrade","fix","audit","release"]);
const kind=z.enum(["auto","mobile","web-app","desktop","hybrid","marketplace","internal-tool"]);
const framework=z.enum(["auto","expo","react","web","any"]);
const preference=z.enum(["quality","speed","cost","bundle","open-source","balanced"]);
const need=z.enum(["ui","navigation","state","data","auth","backend","payments","notifications","location","camera","offline","native-modules","deep-links","analytics","observability","testing","deployment"]);
export function registerAppWorkflowTools(server:any){
 server.registerTool("gameshop_route_app_workflow",{title:"Route App Production Workflow",description:"Classify and route mobile, web-app, desktop, hybrid, marketplace and internal-tool work across UI, native/device, backend/data/auth, payments, QA and release lanes. Read-only routing does not authorize writes, execution or deployment.",inputSchema:z.object({brief:z.string().min(3).max(4000),phase:phase.optional(),kind:kind.optional(),framework:framework.optional(),needs:z.array(need).max(17).optional(),preference:preference.optional(),existingProject:z.boolean().optional()}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async(input:unknown)=>{try{return result(routeAppWorkflow(input as Parameters<typeof routeAppWorkflow>[0]));}catch(error){return fail(error);}});
 server.registerTool("gameshop_app_workflow_matrix",{title:"App Production Routing Matrix",description:"Inspect Game Shop app types, default capability needs, specialist routing and release boundaries.",inputSchema:z.object({}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},async()=>result(appWorkflowMatrix()));
}

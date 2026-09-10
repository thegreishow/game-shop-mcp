import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { chromeDiagnosticsInfo,dispatchChromeDiagnostics,listChromeDiagnosticsRuns } from "../chrome-diagnostics.js";
import { authorizeMcpToolRequest,authorizeRequest,enforceRateLimit,oauthChallenge } from "../security.js";
import { publicErrorMessage } from "../errors.js";
function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}}}
function fail(e:unknown){return{isError:true,content:[{type:"text" as const,text:publicErrorMessage(e)}]}}
const handler=createMcpHandler(server=>{
 server.registerTool("gameshop_chrome_diagnostics_info",{title:"Chrome Diagnostics",description:"Describe the Chrome DevTools MCP deep diagnostics lane.",inputSchema:z.object({}),annotations:{readOnlyHint:true}},async()=>result(chromeDiagnosticsInfo()));
 server.registerTool("gameshop_queue_chrome_diagnostics",{title:"Queue Chrome Diagnostics",description:"Queue an isolated Chrome DevTools MCP workflow for Lighthouse, trace, console, network, screenshot and snapshot evidence.",inputSchema:z.object({url:z.string().url(),projectId:z.string().max(100).optional(),executionId:z.string().max(100).optional(),ref:z.string().max(200).optional()}),annotations:{readOnlyHint:false,openWorldHint:true}},async input=>{try{return result(await dispatchChromeDiagnostics(input))}catch(e){return fail(e)}});
 server.registerTool("gameshop_chrome_diagnostics_runs",{title:"Chrome Diagnostics Runs",description:"List recent Chrome DevTools MCP diagnostics workflow runs.",inputSchema:z.object({limit:z.number().int().min(1).max(20).optional()}),annotations:{readOnlyHint:true,openWorldHint:true}},async input=>{try{return result(await listChromeDiagnosticsRuns(input))}catch(e){return fail(e)}});
});
export async function diagnosticsRoute(request:Request){let auth=authorizeRequest(request);if(auth.ok)auth=await authorizeMcpToolRequest(request,auth);if(!auth.ok){const headers:Record<string,string>={"content-type":"application/json"};if(auth.status===401)headers["www-authenticate"]=oauthChallenge(request);return new Response(JSON.stringify({error:auth.error,requiredScopes:auth.requiredScopes??undefined}),{status:auth.status,headers});}const rate=enforceRateLimit(request);if(!rate.ok)return new Response(JSON.stringify({error:"Rate limit exceeded"}),{status:429});return handler(request)}

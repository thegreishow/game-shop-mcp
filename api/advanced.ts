import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { controlCenterAppInfo, controlCenterSnapshot } from "../src/control-center.js";
import { orchestrationSnapshot } from "../src/orchestrator.js";
import { qaWorkerInfo } from "../src/qa-worker.js";
import { discoveryInfo } from "../src/capability-discovery.js";
import { authorizeRequest, enforceRateLimit } from "../src/security.js";
function asResult(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:typeof data==="object"&&data!==null?data as Record<string,unknown>:{value:data}}}
const handler=createMcpHandler(server=>{server.registerTool("gameshop_control_center",{title:"Game Shop Control Center",description:"Unified autonomous production control-plane snapshot.",inputSchema:z.object({}),annotations:{readOnlyHint:true}},async()=>asResult({app:controlCenterAppInfo(),snapshot:await controlCenterSnapshot(),orchestration:await orchestrationSnapshot(),qa:qaWorkerInfo(),discovery:discoveryInfo()}));});
async function route(request:Request){const auth=authorizeRequest(request);if(!auth.ok)return new Response(JSON.stringify({error:auth.error}),{status:auth.status,headers:{"content-type":"application/json"}});const rate=enforceRateLimit(request);if(!rate.ok)return new Response(JSON.stringify({error:"Rate limit exceeded"}),{status:429});return handler(request)}export{route as GET,route as POST,route as DELETE};

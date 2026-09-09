import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { artifactObjectStoreInfo, persistArtifactObject } from "../src/artifact-storage.js";
import { authorizeRequest, enforceRateLimit } from "../src/security.js";
function result(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data,null,2)}],structuredContent:data as Record<string,unknown>};}
const handler=createMcpHandler(server=>{
 server.registerTool("gameshop_object_store",{title:"Artifact Object Store",description:"Inspect permanent binary object storage for Game Shop artifacts.",inputSchema:z.object({}),annotations:{readOnlyHint:true}},async()=>result(artifactObjectStoreInfo()));
 server.registerTool("gameshop_persist_artifact",{title:"Persist Artifact",description:"Copy a provider artifact from its temporary source URL into permanent Game Shop object storage and attach the storage location to the artifact.",inputSchema:z.object({artifactId:z.string().min(8).max(100),fileName:z.string().max(180).optional()}),annotations:{readOnlyHint:false,openWorldHint:true}},async input=>result(await persistArtifactObject(input)));
});
async function route(request:Request){const auth=authorizeRequest(request);if(!auth.ok)return new Response(JSON.stringify({error:auth.error}),{status:auth.status,headers:{"content-type":"application/json"}});const rate=enforceRateLimit(request);if(!rate.ok)return new Response(JSON.stringify({error:"Rate limit exceeded"}),{status:429,headers:{"content-type":"application/json"}});return handler(request)}
export{route as GET,route as POST,route as DELETE};

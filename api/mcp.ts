import { createMcpHandler } from "mcp-handler";
import { registerCoreTools } from "../src/register-core-tools.js";
import { registerPlatformTools } from "../src/register-platform-tools.js";
import { registerFutureTools } from "../src/register-future-tools.js";
import { registerWorkbenchTools } from "../src/register-workbench-tools.js";
import { registerSdkTools } from "../src/register-sdk-tools.js";
import { routeMcp } from "../src/mcp-route.js";

function withSubmissionAnnotations(server:any){
  const registerTool=server.registerTool.bind(server);
  server.registerTool=(name:string,definition:any,handler:any)=>{
    const annotations={
      readOnlyHint:false,
      destructiveHint:false,
      openWorldHint:false,
      ...(definition?.annotations||{}),
    };
    return registerTool(name,{...definition,annotations},handler);
  };
  return server;
}

const handler=createMcpHandler(rawServer=>{
  const server=withSubmissionAnnotations(rawServer);
  registerCoreTools(server);
  registerPlatformTools(server);
  registerFutureTools(server);
  registerWorkbenchTools(server);
  registerSdkTools(server);
});

async function route(request:Request){return routeMcp(request,handler);}
export{route as GET,route as POST,route as DELETE};

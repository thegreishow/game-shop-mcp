import { createMcpHandler } from "mcp-handler";
import { registerCoreTools } from "../src/register-core-tools.js";
import { registerPlatformTools } from "../src/register-platform-tools.js";
import { registerFutureTools } from "../src/register-future-tools.js";
import { registerHardeningTools } from "../src/register-hardening-tools.js";
import { refreshArcadeRegistry } from "../src/arcade-registry.js";
import { routeMcp } from "../src/mcp-route.js";

const handler=createMcpHandler(server=>{
  registerCoreTools(server);
  registerPlatformTools(server);
  registerFutureTools(server);
  registerHardeningTools(server);
});

async function route(request:Request){
  await refreshArcadeRegistry().catch(()=>{});
  return routeMcp(request,handler);
}
export{route as GET,route as POST,route as DELETE};

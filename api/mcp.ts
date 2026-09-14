import { createMcpHandler } from "mcp-handler";
import { registerCoreTools } from "../src/register-core-tools.js";
import { registerGameWorkflowTools } from "../src/register-game-workflow-tools.js";
import { registerWebsiteWorkflowTools } from "../src/register-website-workflow-tools.js";
import { registerPlatformTools } from "../src/register-platform-tools.js";
import { registerFutureTools } from "../src/register-future-tools.js";
import { registerWorkbenchTools } from "../src/register-workbench-tools.js";
import { registerSdkTools } from "../src/register-sdk-tools.js";
import { registerAutonomousTools } from "../src/register-autonomous-tools.js";
import { routeMcp } from "../src/mcp-route.js";

const submissionAnnotationOverrides:Record<string,Record<string,boolean>>={
  gameshop_invoke_integration:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_orchestrate_integrations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_execute_github_plan:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_github_upsert_file:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_cancel_execution:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
  gameshop_orchestrate_artifact:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_cancel_durable_execution:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
  gameshop_task_cancel:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
  gameshop_place_artifact:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_run_qa:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},
  gameshop_apply_patch:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_remove_project_v2:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
  gameshop_run_autonomous_pipeline:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_continue_provider_task:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},
  gameshop_autonomous_job_prepare_branch:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
  gameshop_autonomous_job_judge:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},
  gameshop_autonomous_job_ship:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},
};

function withSubmissionAnnotations(server:any){
  const registerTool=server.registerTool.bind(server);
  server.registerTool=(name:string,definition:any,handler:any)=>{
    const annotations={
      readOnlyHint:false,
      destructiveHint:false,
      openWorldHint:false,
      ...(definition?.annotations||{}),
      ...(submissionAnnotationOverrides[name]||{}),
    };
    return registerTool(name,{...definition,annotations},handler);
  };
  return server;
}

const handler=createMcpHandler(rawServer=>{
  const server=withSubmissionAnnotations(rawServer);
  registerCoreTools(server);
  registerGameWorkflowTools(server);
  registerWebsiteWorkflowTools(server);
  registerPlatformTools(server);
  registerFutureTools(server);
  registerWorkbenchTools(server);
  registerSdkTools(server);
  registerAutonomousTools(server);
});

async function route(request:Request){return routeMcp(request,handler);}
export{route as GET,route as POST,route as DELETE};

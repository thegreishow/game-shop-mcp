import { hydrateArcadeRegistry } from "../src/arcade-registry.js";
import { buildWorkbenchMission } from "../src/workbench.js";

export async function GET(){
  const priorShopToken=process.env.GAME_SHOP_GITHUB_TOKEN;
  const priorGithubToken=process.env.GITHUB_TOKEN;
  delete process.env.GAME_SHOP_GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try{
    const canonical=await hydrateArcadeRegistry();
    const mission=buildWorkbenchMission({
      goal:"Review Dubai Legends, route browser-game QA and recommend the next production steps.",
      projectId:"dubai-legends",
      preference:"quality",
    });
    return Response.json({
      ok:true,
      canonical:{available:canonical.available,hydrated:canonical.hydrated,credentialMode:(canonical as any).credentialMode,hasDubaiLegends:Array.isArray((canonical as any).projects)&&((canonical as any).projects as string[]).includes("dubai-legends")},
      workbench:{project:mission.project,nextRecommendedTool:mission.executionView.nextRecommendedTool,workflowLanes:mission.workflow.map((step:any)=>step.lane)},
    },{headers:{"cache-control":"no-store"}});
  }catch(error){
    return Response.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500,headers:{"cache-control":"no-store"}});
  }finally{
    if(priorShopToken===undefined)delete process.env.GAME_SHOP_GITHUB_TOKEN;else process.env.GAME_SHOP_GITHUB_TOKEN=priorShopToken;
    if(priorGithubToken===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=priorGithubToken;
  }
}

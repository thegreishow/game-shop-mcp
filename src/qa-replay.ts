import { getQaRecipe, listQaRecipes, recordQaRecipeResult } from "./qa-memory.js";
import { runQaSwarm } from "./qa-swarm.js";

export async function replayQaRecipe(input:{recipeId:string;url?:string;ref?:string;autoPreview?:boolean;queuePlaywrightCi?:boolean}){
 const recipe=await getQaRecipe(input.recipeId);if(!recipe)throw new Error("QA recipe not found.");if(!recipe.approved)throw new Error("QA recipe is not approved for replay.");
 const result=await runQaSwarm({projectId:recipe.projectId,ref:input.ref,url:input.url,checks:recipe.checks,interactions:recipe.interactions,autoPreview:input.autoPreview??true,queuePlaywrightCi:input.queuePlaywrightCi??true});
 const status=result.gate==="green"?"passed":result.gate==="red"?"failed":null;
 if(status)await recordQaRecipeResult(recipe.recipeId,status);
 return{recipe,result,recorded:status};
}
export async function replayProjectRegressions(input:{projectId:string;url?:string;ref?:string;limit?:number;autoPreview?:boolean;queuePlaywrightCi?:boolean}){
 const recipes=(await listQaRecipes({projectId:input.projectId,approvedOnly:true})).slice(0,Math.min(20,input.limit??10));const results=[] as unknown[];let passed=0,failed=0,pending=0;
 for(const recipe of recipes){const replay=await replayQaRecipe({recipeId:recipe.recipeId,url:input.url,ref:input.ref,autoPreview:input.autoPreview,queuePlaywrightCi:input.queuePlaywrightCi});results.push(replay);const gate=replay.result.gate;if(gate==="green")passed++;else if(gate==="red")failed++;else pending++;}
 const gate=failed?"red":pending?"provisional":recipes.length?"green":"blocked";
 return{projectId:input.projectId,recipes:recipes.length,passed,failed,pending,gate,releaseAllowed:gate==="green",results};
}
export function qaReplayInfo(){return{mode:"approved-regression-replay",source:"game_shop_qa_recipes",runner:"qa-swarm",policy:{onlyApprovedRecipes:true,maxRecipesPerRun:20,releaseRequiresAllGreen:true,provisionalDoesNotShip:true}};}

import fs from "node:fs/promises";
import path from "node:path";
import { executeBrowserQa } from "../src/browser-adapters.js";

async function main(){
 const url=process.env.GAME_SHOP_QA_TARGET_URL;
 if(!url)throw new Error("GAME_SHOP_QA_TARGET_URL is required.");
 let interactions:string[]=[];
 try{const parsed=JSON.parse(process.env.GAME_SHOP_QA_INTERACTIONS_JSON||"[]");if(Array.isArray(parsed))interactions=parsed.filter(v=>typeof v==="string").slice(0,8);}catch{}
 const startedAt=new Date().toISOString();
 const evidence=await executeBrowserQa({url,provider:"playwright-mcp",interactions});
 const finishedAt=new Date().toISOString();
 const out=path.resolve(".gameshop-qa");
 await fs.mkdir(out,{recursive:true});
 const result={schemaVersion:"1.0",projectId:process.env.GAME_SHOP_QA_PROJECT_ID||null,executionId:process.env.GAME_SHOP_QA_EXECUTION_ID||null,url,startedAt,finishedAt,evidence};
 await fs.writeFile(path.join(out,"evidence.json"),JSON.stringify(result,null,2));
 const summary=["# Game Shop Playwright QA","",`- URL: ${url}`,`- Errors: ${evidence.errors.length}`,`- Console captures: ${evidence.console.length}`,`- Network captures: ${evidence.network.length}`,`- Screenshots: ${evidence.screenshots.length}`,`- Tools discovered: ${evidence.tools.length}`,"",evidence.errors.length?"## Errors\n"+evidence.errors.map(e=>`- ${e}`).join("\n"):"## Result\nNo adapter-level errors were reported."].join("\n");
 await fs.writeFile(path.join(out,"summary.md"),summary);
 if(evidence.errors.length)process.exitCode=1;
}
main().catch(async error=>{await fs.mkdir(".gameshop-qa",{recursive:true});await fs.writeFile(".gameshop-qa/fatal.txt",String(error?.stack||error));console.error(error);process.exitCode=1;});

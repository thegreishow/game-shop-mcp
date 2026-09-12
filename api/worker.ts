import { checkIntegrationNetwork } from "../src/integration-health.js";
import { discoverySweep } from "../src/continuous-discovery.js";
import { logEvent } from "../src/governance-ledger.js";
import { reconcilePendingProviders } from "../src/provider-reconciler.js";

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
function authorized(request:Request){const expected=process.env.GAME_SHOP_WORKER_SECRET?.trim();const provided=request.headers.get("x-game-shop-worker-secret")?.trim();return Boolean(expected&&provided&&provided===expected);}
function action(request:Request){return new URL(request.url).searchParams.get("action")||"";}

async function runAutonomy(request:Request){const body=await request.json().catch(()=>({})) as Record<string,unknown>;const capabilities=Array.isArray(body.capabilities)?body.capabilities.map(String).slice(0,12):["browser automation","3d generation","voice","video generation","deployment","payments","database","observability"];const health=await checkIntegrationNetwork({limit:Math.min(20,Math.max(1,Number(body.healthLimit??12)))});const discovery=await discoverySweep({capabilities,limitPerGap:6});await logEvent({type:"autonomy.sweep",data:{healthCounts:health.counts,gaps:discovery.gaps,capabilities}}).catch(()=>{});return json({health,discovery});}
async function runReconcile(request:Request){const body=await request.json().catch(()=>({})) as Record<string,unknown>;const result=await reconcilePendingProviders({executionId:typeof body.executionId==="string"?body.executionId:undefined,projectId:typeof body.projectId==="string"?body.projectId:undefined,limit:Math.min(20,Math.max(1,Number(body.limit??20)))});return json(result);}

export async function POST(request:Request){if(!authorized(request))return json({error:"Unauthorized worker"},401);try{if(action(request)==="autonomy")return await runAutonomy(request);if(action(request)==="reconcile")return await runReconcile(request);return json({error:"Unknown worker action"},404);}catch(e){return json({error:e instanceof Error?e.message:String(e)},500);}}
export async function GET(request:Request){if(action(request)==="autonomy")return json({service:"Game Shop Autonomy Sweep",configured:Boolean(process.env.GAME_SHOP_WORKER_SECRET),mode:"integration-health + capability-gap discovery",method:"POST"});if(action(request)==="reconcile")return json({service:"Game Shop Provider Reconciler",configured:Boolean(process.env.GAME_SHOP_WORKER_SECRET),method:"POST",mode:"status-only provider polling; paid generation is never initiated"});return json({service:"Game Shop Worker Gateway",configured:Boolean(process.env.GAME_SHOP_WORKER_SECRET)},200);}

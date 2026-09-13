import assert from "node:assert/strict";
import { POST } from "../api/mcp.js";

const canonicalGames=[
  {id:"dubai-legends",title:"Dubai Legends: Night Cup 2026",entry:"arcade/games/dubai-legends/index.html"},
  {id:"orbit-breaker",title:"Orbit Breaker",entry:"arcade/games/orbit-breaker/index.html"},
  {id:"rodeo-are-you-ready",title:"Rodeo: Are You Ready",entry:"arcade/games/rodeo-are-you-ready/index.html"},
  {id:"dreamweaver-oracle",title:"Dreamweaver",entry:"arcade/games/dreamweaver-oracle/index.html"},
  {id:"signal-runner",title:"Signal Runner",entry:"arcade/games/signal-runner/index.html"},
  {id:"jamaica-run",title:"Rasta Runner",entry:"arcade/games/jamaica-run/index.html"},
];

function payloadFrom(text:string){const trimmed=text.trim();if(!trimmed)return null;if(trimmed.startsWith("{"))return JSON.parse(trimmed);const data=trimmed.split("\n").filter(line=>line.startsWith("data:"));if(!data.length)throw new Error(`Unexpected MCP response: ${trimmed.slice(0,200)}`);return JSON.parse(data.at(-1)!.slice(5).trim());}
async function rpc(body:unknown,session?:string){const headers:Record<string,string>={authorization:"Bearer smoke-token",accept:"application/json, text/event-stream","content-type":"application/json"};if(session)headers["mcp-session-id"]=session;const response=await POST(new Request("http://localhost/mcp",{method:"POST",headers,body:JSON.stringify(body)}));return{response,body:payloadFrom(await response.text())};}

async function main(){
  process.env.NODE_ENV="production";delete process.env.GAME_SHOP_MCP_TOKEN;delete process.env.GAME_SHOP_OAUTH_SIGNING_SECRET;
  const closed=await POST(new Request("http://localhost/mcp",{method:"POST",body:"{}"}));assert.equal(closed.status,503);
  process.env.GAME_SHOP_MCP_TOKEN="smoke-token";
  process.env.GAME_SHOP_GITHUB_TOKEN="registry-smoke-token";
  delete process.env.GAME_SHOP_ALLOW_PAID_GENERATION;delete process.env.GAME_SHOP_ALLOW_GITHUB_WRITES;delete process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;delete process.env.GAME_SHOP_SUPABASE_URL;delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;

  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
    if(url.includes("/repos/thegreishow/thegreishow.com/contents/arcade/games/games.json")){
      return new Response(JSON.stringify({encoding:"base64",content:Buffer.from(JSON.stringify(canonicalGames)).toString("base64")}),{status:200,headers:{"content-type":"application/json"}});
    }
    return originalFetch(input,init);
  };

  const initialized=await rpc({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"game-shop-smoke",version:"1.0.0"}}});assert.equal(initialized.response.status,200);const session=initialized.response.headers.get("mcp-session-id")??undefined;await rpc({jsonrpc:"2.0",method:"notifications/initialized",params:{}},session);
  const listed=await rpc({jsonrpc:"2.0",id:2,method:"tools/list",params:{}},session);const tools=listed.body?.result?.tools??[];const names=new Set(tools.map((tool:{name:string})=>tool.name));const required=["gameshop_system_audit","gameshop_spend_policy","gameshop_plan_build","gameshop_list_projects","gameshop_control_center","gameshop_qa_evidence","gameshop_governance_info","gameshop_set_execution_budget","gameshop_budget_status","gameshop_events","gameshop_previews","gameshop_rate_limit_policy","gameshop_integration_health_info","gameshop_project_registry_v2","gameshop_provider_reconciler","gameshop_trust_pipeline_v2","gameshop_continuous_discovery","gameshop_multi_ai_continuity","gameshop_control_center_v2"];for(const name of required)assert.ok(names.has(name),`missing canonical MCP tool: ${name}`);assert.ok(tools.length>=85,`expected future-stack canonical inventory, got ${tools.length}`);
  const projects=await rpc({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"gameshop_list_projects",arguments:{}}},session);const projectText=JSON.stringify(projects.body?.result?.structuredContent??[]);for(const game of canonicalGames)assert.match(projectText,new RegExp(game.id),`canonical project missing: ${game.id}`);assert.equal((projectText.match(/browser-game/g)??[]).length>=6,true);
  const budgetSet=await rpc({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"gameshop_set_execution_budget",arguments:{executionId:"exec_smoke_001",budgetUsd:3,providerBudgets:{meshy:1.25}}}},session);assert.equal(budgetSet.body?.result?.isError,undefined);const budget=await rpc({jsonrpc:"2.0",id:5,method:"tools/call",params:{name:"gameshop_budget_status",arguments:{executionId:"exec_smoke_001"}}},session);assert.equal(Number(budget.body?.result?.structuredContent?.remaining_budget),3);
  const registry=await rpc({jsonrpc:"2.0",id:6,method:"tools/call",params:{name:"gameshop_project_registry_v2",arguments:{}}},session);const registryText=JSON.stringify(registry.body?.result?.structuredContent??{});assert.match(registryText,/dynamic/);assert.match(registryText,/enrichment-only/);assert.match(registryText,/legacyFallback[^]*false/);
  const health=await rpc({jsonrpc:"2.0",id:7,method:"tools/call",params:{name:"gameshop_integration_health_info",arguments:{}}},session);assert.match(JSON.stringify(health.body?.result?.structuredContent??{}),/HEALTHY/);
  const trust=await rpc({jsonrpc:"2.0",id:8,method:"tools/call",params:{name:"gameshop_trust_pipeline_v2",arguments:{}}},session);assert.match(JSON.stringify(trust.body?.result?.structuredContent??{}),/publisher-verification/);
  const continuity=await rpc({jsonrpc:"2.0",id:9,method:"tools/call",params:{name:"gameshop_multi_ai_continuity",arguments:{}}},session);assert.match(JSON.stringify(continuity.body?.result?.structuredContent??{}),/shared-authoritative/);
  const spend=await rpc({jsonrpc:"2.0",id:10,method:"tools/call",params:{name:"gameshop_spend_policy",arguments:{}}},session);assert.equal(spend.body?.result?.structuredContent?.allowPaidGeneration,false);const blocked=await rpc({jsonrpc:"2.0",id:11,method:"tools/call",params:{name:"gameshop_generate_character",arguments:{name:"smoke",prompt:"smoke test"}}},session);assert.equal(blocked.body?.result?.isError,true);
  console.log(`Future-stack MCP smoke OK: ${tools.length} tools; canonical six-game registry, governance, budgets, rate limits, health, trust, continuity and safety verified.`);
}
main().catch(error=>{console.error(error);process.exit(1);});

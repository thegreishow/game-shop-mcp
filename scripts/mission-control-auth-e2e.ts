import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

process.env.GAME_SHOP_OAUTH_SIGNING_SECRET=`e2e-${randomBytes(32).toString("hex")}`;
process.env.GAME_SHOP_PUBLIC_URL="https://game-shop-mcp.vercel.app";
process.env.GAME_SHOP_SUPABASE_URL="";
process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY="";

const issuer=process.env.GAME_SHOP_PUBLIC_URL;
const resource=`${issuer}/mcp`;
const redirectUri=`${issuer}/console`;

const oauth=await import("../src/oauth.js");
const { POST }=await import("../api/mcp.js");

async function tokenFor(scope:string){
  const verifier=randomBytes(32).toString("base64url");
  const challenge=createHash("sha256").update(verifier).digest("base64url");
  const client=oauth.createDynamicClient({issuer,redirectUris:[redirectUri],metadata:{client_name:"Mission Control authenticated E2E",scope}});
  const code=oauth.createAuthorizationCode({issuer,clientId:client.client_id,redirectUri,scope,codeChallenge:challenge,resource});
  const tokens=await oauth.exchangeAuthorizationCode({code,clientId:client.client_id,redirectUri,codeVerifier:verifier,issuer,resource});
  return tokens.access_token;
}

function parse(text:string){
  const value=text.trim();
  if(!value)return null;
  if(value.startsWith("{"))return JSON.parse(value);
  const rows=value.split("\n").filter(line=>line.startsWith("data:"));
  return rows.length?JSON.parse(rows.at(-1)!.slice(5).trim()):null;
}

async function rpc(accessToken:string,payload:Record<string,unknown>,sessionId?:string){
  const headers:Record<string,string>={authorization:`Bearer ${accessToken}`,accept:"application/json, text/event-stream","content-type":"application/json"};
  if(sessionId)headers["mcp-session-id"]=sessionId;
  const response=await POST(new Request(resource,{method:"POST",headers,body:JSON.stringify(payload)}));
  const text=await response.text();
  return{status:response.status,headers:response.headers,body:parse(text),text,sessionId:response.headers.get("mcp-session-id")??sessionId};
}

async function session(accessToken:string){
  let current:string|undefined;
  const initialized=await rpc(accessToken,{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"mission-control-auth-e2e",version:"1.0.0"}}});
  assert.equal(initialized.status,200,initialized.text);current=initialized.sessionId;
  assert.ok(initialized.body?.result,"MCP initialize must return a result");
  const notification=await rpc(accessToken,{jsonrpc:"2.0",method:"notifications/initialized",params:{}},current);
  assert.ok([200,202].includes(notification.status),notification.text);current=notification.sessionId;
  let id=10;
  return async(name:string,args:Record<string,unknown>={})=>{
    const response=await rpc(accessToken,{jsonrpc:"2.0",id:++id,method:"tools/call",params:{name,arguments:args}},current);
    current=response.sessionId;
    return response;
  };
}

function structured(response:Awaited<ReturnType<Awaited<ReturnType<typeof session>>>>){
  const result=response.body?.result;
  if(result?.isError)throw new Error(result.content?.map((x:any)=>x.text).join("\n")||"Tool failed");
  const value=result?.structuredContent;
  if(Array.isArray(value))return value;
  if(value&&typeof value==="object"&&"value" in value)return (value as any).value;
  const text=result?.content?.find?.((x:any)=>x.type==="text"&&typeof x.text==="string")?.text;
  if(text){try{return JSON.parse(text)}catch{}}
  return value??result;
}

const standardScope="gameshop.read gameshop.plan gameshop.qa gameshop.execute offline_access";
const standardToken=await tokenFor(standardScope);
const call=await session(standardToken);

const projectsResponse=await call("gameshop_mission_projects");
assert.equal(projectsResponse.status,200,projectsResponse.text);
const projectValue=structured(projectsResponse) as any;
const projects:Array<any>=Array.isArray(projectValue)?projectValue:Object.values(projectValue??{}).filter((p:any)=>p&&typeof p==="object"&&p.projectId);
const requiredProjects=["thegreishow-com","wata-dash-game","cruber"];
for(const projectId of requiredProjects)assert.ok(projects.some(p=>p.projectId===projectId),`Missing Mission Control project ${projectId}`);

const cases=[
  {projectId:"thegreishow-com",lane:"website",brief:"Authenticated E2E: inspect the artist website, preserve the current stack, and prepare a premium incremental upgrade."},
  {projectId:"wata-dash-game",lane:"game",brief:"Authenticated E2E: inspect Wata Dash Game, preserve Phaser/browser runtime, and prepare a gameplay polish handoff."},
  {projectId:"cruber",lane:"app",brief:"Authenticated E2E: inspect Cruber as an existing marketplace app and prepare an incremental reliability upgrade."},
];

const executionIds:string[]=[];
for(const testCase of cases){
  const contextResponse=await call("gameshop_mission_context",{projectId:testCase.projectId});
  assert.equal(contextResponse.status,200,contextResponse.text);
  const context=structured(contextResponse) as any;
  assert.equal(context.project?.project?.productKind,testCase.lane,`${testCase.projectId} inferred wrong lane`);
  assert.ok(Array.isArray(context.project?.specialists)&&context.project.specialists.length>0,`${testCase.projectId} must expose specialist lanes`);

  const planResponse=await call("gameshop_plan_mission",{projectId:testCase.projectId,brief:testCase.brief,phase:"upgrade",preference:"balanced",budgetUsd:0});
  assert.equal(planResponse.status,200,planResponse.text);
  const planned=structured(planResponse) as any;
  const executionId=planned.execution?.executionId??planned.packet?.executionId;
  assert.ok(executionId,`${testCase.projectId} mission did not create an execution`);
  executionIds.push(executionId);
  assert.equal(planned.packet?.mission?.lane,testCase.lane,`${testCase.projectId} packet lane mismatch`);
  assert.ok(planned.packet?.handoffs?.length>0,`${testCase.projectId} needs at least one handoff`);

  const dispatchResponse=await call("gameshop_execute_mission_handoff",{executionId,note:"Authenticated E2E dispatch only; no source mutation."});
  assert.equal(dispatchResponse.status,200,dispatchResponse.text);
  const dispatched=structured(dispatchResponse) as any;
  assert.equal(dispatched.executionId,executionId);
  assert.ok(dispatched.handoff?.target,"Handoff must name a specialist target");
  assert.ok(typeof dispatched.handoff?.clientMediated==="boolean","Handoff must distinguish client-mediated vs server-capable execution");

  const startResponse=await call("gameshop_execute_mission_start",{executionId,message:"Authenticated E2E start"});
  assert.equal(startResponse.status,200,startResponse.text);
  const qaStageResponse=await call("gameshop_qa_mission",{executionId,message:"Authenticated E2E QA stage"});
  assert.equal(qaStageResponse.status,200,qaStageResponse.text);
}

const repairId=executionIds[0]!;
let response=await call("gameshop_record_visual_qa",{projectId:"thegreishow-com",executionId:repairId,status:"failed",findings:["E2E synthetic visual drift"],consoleErrors:[],networkErrors:[],playwright:{status:"failed",source:"authenticated-e2e"},notes:"Synthetic failure to prove QA → Repair transition."});
assert.equal(response.status,200,response.text);
response=await call("gameshop_repair_mission",{executionId:repairId,message:"Authenticated E2E repair cycle"});
assert.equal(response.status,200,response.text);
response=await call("gameshop_qa_mission",{executionId:repairId,message:"Return to QA after synthetic repair"});
assert.equal(response.status,200,response.text);
response=await call("gameshop_record_visual_qa",{projectId:"thegreishow-com",executionId:repairId,status:"passed",findings:[],consoleErrors:[],networkErrors:[],playwright:{status:"passed",source:"authenticated-e2e"},notes:"Synthetic green review after repair."});
assert.equal(response.status,200,response.text);

const releaseWithoutDeploy=await call("gameshop_release_mission",{executionId:repairId,message:"Scope gate test"});
assert.equal(releaseWithoutDeploy.status,403,"Release must require gameshop.deploy scope");
assert.match(releaseWithoutDeploy.text,/gameshop\.deploy/);

const deployToken=await tokenFor(`${standardScope} gameshop.deploy`);
const deployCall=await session(deployToken);
const releaseWithDeploy=await deployCall("gameshop_release_mission",{executionId:repairId,message:"Governor gate test"});
assert.equal(releaseWithDeploy.status,200,releaseWithDeploy.text);
const releaseResult=releaseWithDeploy.body?.result;
assert.equal(releaseResult?.isError,true,"Release governor should block synthetic/incomplete release evidence rather than mark Released");
assert.match(JSON.stringify(releaseResult),/Missing required persisted evidence|release|blocked|green/i);

console.log(`Authenticated Mission Control E2E OK: ${cases.length} real project contexts, durable plans, specialist dispatch, QA→Repair→QA, deploy scope gate and release-governor gate verified.`);

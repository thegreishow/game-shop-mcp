import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

process.env.GAME_SHOP_OAUTH_SIGNING_SECRET=`e2e-${randomBytes(32).toString("hex")}`;
process.env.GAME_SHOP_PUBLIC_URL="https://game-shop-mcp.vercel.app";
process.env.GAME_SHOP_SUPABASE_URL="";
process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY="";
const issuer=process.env.GAME_SHOP_PUBLIC_URL, resource=`${issuer}/mcp`, redirectUri=`${issuer}/console`;
const oauth=await import("../src/oauth.js");
const {POST}=await import("../api/mcp.js");
async function mint(scope:string){const verifier=randomBytes(32).toString("base64url"),challenge=createHash("sha256").update(verifier).digest("base64url");const client=oauth.createDynamicClient({issuer,redirectUris:[redirectUri],metadata:{client_name:"Mission Control E2E",scope}});const code=oauth.createAuthorizationCode({issuer,clientId:client.client_id,redirectUri,scope,codeChallenge:challenge,resource});return(await oauth.exchangeAuthorizationCode({code,clientId:client.client_id,redirectUri,codeVerifier:verifier,issuer,resource})).access_token;}
function decode(text:string){const t=text.trim();if(!t)return null;if(t.startsWith("{"))return JSON.parse(t);const rows=t.split("\n").filter(x=>x.startsWith("data:"));return rows.length?JSON.parse(rows.at(-1)!.slice(5).trim()):null;}
async function raw(token:string,payload:any,sid?:string){const h:any={authorization:`Bearer ${token}`,accept:"application/json, text/event-stream","content-type":"application/json"};if(sid)h["mcp-session-id"]=sid;const r=await POST(new Request(resource,{method:"POST",headers:h,body:JSON.stringify(payload)}));const text=await r.text();return{status:r.status,text,body:decode(text),sid:r.headers.get("mcp-session-id")??sid};}
async function client(token:string){let sid:string|undefined,id=0;let r=await raw(token,{jsonrpc:"2.0",id:++id,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"mission-control-auth-e2e",version:"1"}}});assert.equal(r.status,200,r.text);sid=r.sid;r=await raw(token,{jsonrpc:"2.0",method:"notifications/initialized",params:{}},sid);assert.ok([200,202].includes(r.status),r.text);sid=r.sid;return async(name:string,args:any={})=>{const out=await raw(token,{jsonrpc:"2.0",id:++id,method:"tools/call",params:{name,arguments:args}},sid);sid=out.sid;return out;};}
function data(r:any){const result=r.body?.result;if(result?.isError)throw new Error(result.content?.map((x:any)=>x.text).join("\n")||"Tool failed");const s=result?.structuredContent;if(Array.isArray(s))return s;if(s&&typeof s==="object"&&"value" in s)return s.value;const text=result?.content?.find?.((x:any)=>x.type==="text")?.text;if(text){try{return JSON.parse(text)}catch{}}return s??result;}

const scope="gameshop.read gameshop.plan gameshop.qa gameshop.execute offline_access",call=await client(await mint(scope));
const listed=data(await call("gameshop_mission_projects"));const projects=Array.isArray(listed)?listed:Object.values(listed??{}).filter((p:any)=>p?.projectId);
const cases=[{projectId:"thegreishow-site",lane:"website",brief:"Authenticated E2E website upgrade."},{projectId:"watadash-game",lane:"game",brief:"Authenticated E2E gameplay polish."},{projectId:"cruber",lane:"app",brief:"Authenticated E2E marketplace reliability upgrade."}];
for(const c of cases)assert.ok(projects.some((p:any)=>p.projectId===c.projectId),`Missing Mission Control project ${c.projectId}`);
const ids:string[]=[];
for(const c of cases){const ctx=data(await call("gameshop_mission_context",{projectId:c.projectId}));assert.equal(ctx.project?.project?.productKind,c.lane);assert.ok(ctx.project?.specialists?.length);const planned=data(await call("gameshop_plan_mission",{projectId:c.projectId,brief:c.brief,phase:"upgrade",preference:"balanced",budgetUsd:0}));const executionId=planned.execution?.executionId??planned.packet?.executionId;assert.ok(executionId);ids.push(executionId);assert.equal(planned.packet?.mission?.lane,c.lane);assert.ok(planned.packet?.handoffs?.length);const dispatched=data(await call("gameshop_execute_mission_handoff",{executionId,note:"E2E dispatch only"}));assert.ok(dispatched.handoff?.target);assert.equal(typeof dispatched.handoff?.clientMediated,"boolean");assert.equal((await call("gameshop_execute_mission_start",{executionId})).status,200);assert.equal((await call("gameshop_qa_mission",{executionId})).status,200);}
const executionId=ids[0]!;
assert.equal((await call("gameshop_record_visual_qa",{projectId:"thegreishow-site",executionId,status:"failed",findings:["synthetic drift"],playwright:{status:"failed"}})).status,200);
assert.equal((await call("gameshop_repair_mission",{executionId})).status,200);
assert.equal((await call("gameshop_qa_mission",{executionId})).status,200);
assert.equal((await call("gameshop_record_visual_qa",{projectId:"thegreishow-site",executionId,status:"passed",findings:[],playwright:{status:"passed"}})).status,200);
const patchWithoutWrite=await call("gameshop_apply_patch_mission_and_rerun",{executionId,operations:[{path:"README.md",content:"scope gate only"}]});assert.equal(patchWithoutWrite.status,403);assert.match(patchWithoutWrite.text,/gameshop\.write/);
const noDeploy=await call("gameshop_release_mission",{executionId});assert.equal(noDeploy.status,403);assert.match(noDeploy.text,/gameshop\.deploy/);
const releaseCall=await client(await mint(`${scope} gameshop.deploy`));const governed=await releaseCall("gameshop_release_mission",{executionId});assert.equal(governed.status,200,governed.text);assert.equal(governed.body?.result?.isError,true);const postRelease=data(await releaseCall("gameshop_mission_job",{executionId}));assert.notEqual(postRelease.stage,"released","Release governor must not allow an incomplete evidence set to reach Released");
console.log("Authenticated Mission Control E2E OK: 3 real projects, dispatch, QA→Repair→QA, Write+QA mutation scope, Deploy scope and release governor verified.");

import { mcpCallTool,mcpInitialize,mcpListTools } from "./mcp-http-client.js";
export type BrowserQaProvider="browserbase"|"playwright-mcp";
export type BrowserAssertion=
 | {kind:"selector-visible";selector:string}
 | {kind:"selector-text";selector:string;includes:string}
 | {kind:"title-includes";includes:string}
 | {kind:"url-includes";includes:string}
 | {kind:"body-min-text";min:number}
 | {kind:"element-count";selector:string;min:number}
 | {kind:"canvas-ready";selector?:string};
export type BrowserJudgement={authoritative:boolean;passed:boolean;assertions:number;errors:string[]};
export type BrowserEvidence={provider:BrowserQaProvider;url:string;sessionId?:string;tools:string[];steps:Array<Record<string,unknown>>;console:Array<Record<string,unknown>>;network:Array<Record<string,unknown>>;screenshots:Array<Record<string,unknown>>;snapshot?:unknown;performance?:unknown;assertions?:unknown;judgement?:BrowserJudgement;errors:string[]};
function configuredProvider(preferred?:BrowserQaProvider):BrowserQaProvider{if(preferred)return preferred;if(process.env.BROWSERBASE_API_KEY)return"browserbase";return"playwright-mcp";}
function browserbaseUrl(){const key=process.env.BROWSERBASE_API_KEY;if(!key)throw new Error("BROWSERBASE_API_KEY is not configured.");const url=new URL("https://mcp.browserbase.com/mcp");url.searchParams.set("browserbaseApiKey",key);url.searchParams.set("keepAlive","false");return url.toString();}
function playwrightUrl(){const url=process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL;if(!url)throw new Error("GAME_SHOP_PLAYWRIGHT_MCP_URL is not configured.");return url;}
function content(data:unknown){const root=data as Record<string,unknown>|null;const result=(root?.result??root) as Record<string,unknown>|undefined;return result?.structuredContent??result?.content??result??data;}
function evidenceText(data:unknown){try{return JSON.stringify(data).toLowerCase();}catch{return String(data??"").toLowerCase();}}
async function call(url:string,name:string,args:Record<string,unknown>,sessionId?:string){const r=await mcpCallTool({url,name,arguments:args,sessionId,timeoutMs:30000});return{sessionId:r.sessionId,data:content(r.data)};}
function assertionCode(assertions:BrowserAssertion[]){return assertions.map((assertion,index)=>{
 const fail=(message:string)=>`failures.push(${JSON.stringify(`assertion-${index+1}: ${message}`)});`;
 switch(assertion.kind){
  case"selector-visible":return`{const el=document.querySelector(${JSON.stringify(assertion.selector)});if(!el||!(el instanceof HTMLElement)||el.hidden||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden')${fail(`selector not visible: ${assertion.selector}`)}}`;
  case"selector-text":return`{const el=document.querySelector(${JSON.stringify(assertion.selector)});if(!el||!(el.textContent||'').includes(${JSON.stringify(assertion.includes)}))${fail(`selector text missing '${assertion.includes}': ${assertion.selector}`)}}`;
  case"title-includes":return`if(!document.title.includes(${JSON.stringify(assertion.includes)}))${fail(`title missing '${assertion.includes}'`)}`;
  case"url-includes":return`if(!location.href.includes(${JSON.stringify(assertion.includes)}))${fail(`url missing '${assertion.includes}'`)}`;
  case"body-min-text":return`if((document.body?.innerText||'').trim().length<${Math.max(0,assertion.min)})${fail(`body text shorter than ${assertion.min}`)}`;
  case"element-count":return`if(document.querySelectorAll(${JSON.stringify(assertion.selector)}).length<${Math.max(0,assertion.min)})${fail(`element count below ${assertion.min}: ${assertion.selector}`)}`;
  case"canvas-ready":return`{const canvas=document.querySelector(${JSON.stringify(assertion.selector??"canvas")});if(!(canvas instanceof HTMLCanvasElement)||canvas.width<1||canvas.height<1)${fail(`canvas not ready: ${assertion.selector??"canvas"}`)}}`;
 }
}).join("\n");}
export async function executeBrowserQa(input:{url:string;provider?:BrowserQaProvider;interactions?:string[];assertions?:BrowserAssertion[]}){const provider=configuredProvider(input.provider);const endpoint=provider==="browserbase"?browserbaseUrl():playwrightUrl();const init=await mcpInitialize({url:endpoint,timeoutMs:15000});const listed=await mcpListTools({url:endpoint,sessionId:init.sessionId,timeoutMs:15000});let sessionId=listed.sessionId;const names=new Set(listed.tools.map(t=>t.name));const assertions=(input.assertions??[]).slice(0,20);const evidence:BrowserEvidence={provider,url:input.url,sessionId,tools:[...names],steps:[],console:[],network:[],screenshots:[],errors:[]};
 const invoke=async(name:string,args:Record<string,unknown>={})=>{if(!names.has(name))return null;try{const r=await call(endpoint,name,args,sessionId);sessionId=r.sessionId??sessionId;evidence.sessionId=sessionId;evidence.steps.push({tool:name,ok:true});return r.data}catch(error){const message=error instanceof Error?error.message:String(error);evidence.errors.push(`${name}: ${message}`);evidence.steps.push({tool:name,ok:false,error:message});return null}};
 if(provider==="browserbase"){
  await invoke("start");await invoke("navigate",{url:input.url});
  const extracted=await invoke("extract",{instruction:"Inspect the page for visible error messages, broken or blank sections, missing primary content, obvious layout failures, and summarize the main interactive controls."});if(extracted)evidence.snapshot=extracted;
  for(const action of (input.interactions??[]).slice(0,8))await invoke("act",{action});
  const final=await invoke("extract",{instruction:"Return the current page title, main visible content, any error states, and whether primary controls appear usable."});if(final)evidence.snapshot=final;
  evidence.judgement={authoritative:false,passed:evidence.errors.length===0,assertions:0,errors:[...evidence.errors]};
  await invoke("end");return evidence;
 }
 if(names.has("browser_run_code")){
  const code=`async (page) => {\nconst consoleErrors=[]; const failedRequests=[]; const badResponses=[];\npage.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text())});\npage.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText||'failed'}));\npage.on('response',r=>{if(r.status()>=400) badResponses.push({url:r.url(),status:r.status()})});\nawait page.goto(${JSON.stringify(input.url)},{waitUntil:'domcontentloaded',timeout:30000});\nawait page.waitForTimeout(500);\nconst assertions=await page.evaluate(() => {const failures=[];${assertionCode(assertions)}return {passed:failures.length===0,failures,title:document.title,url:location.href,readyState:document.readyState,bodyTextLength:(document.body?.innerText||'').length};});\nconst hard=[...consoleErrors.map(message=>({kind:'console',message})),...failedRequests.map(value=>({kind:'requestfailed',...value})),...badResponses.map(value=>({kind:'http',...value})),...assertions.failures.map(message=>({kind:'assertion',message}))];\nif(hard.length) throw new Error('GAME_SHOP_BROWSER_JUDGE:'+JSON.stringify({hard,assertions}));\nreturn {passed:true,consoleErrors,failedRequests,badResponses,assertions};\n}`;
  const judged=await invoke("browser_run_code",{code});if(judged)evidence.assertions=judged;
 }else await invoke("browser_navigate",{url:input.url});
 const snap=await invoke("browser_snapshot");if(snap)evidence.snapshot=snap;
 for(const action of (input.interactions??[]).slice(0,8)){
  if(names.has("browser_run_code"))await invoke("browser_run_code",{code:`async (page) => { /* bounded QA intent: ${action.replace(/\*\//g,"")} */ return {url:page.url(),title:await page.title()}; }`});
 }
 const consoleData=await invoke("browser_console_messages",{level:"error"})??await invoke("browser_console_messages",{});if(consoleData){evidence.console.push({data:consoleData});const text=evidenceText(consoleData);if(!/(total messages[:= ]+0|no console|\[\]|"messages":\[\])/.test(text)&&/(error|exception|uncaught|failed)/.test(text))evidence.errors.push("console: browser console reported runtime errors");}
 const networkData=await invoke("browser_network_requests",{includeStatic:false})??await invoke("browser_network_requests",{});if(networkData){evidence.network.push({data:networkData});const text=evidenceText(networkData);if(/\b(4\d\d|5\d\d)\b|requestfailed|net::err|failed to fetch/.test(text))evidence.errors.push("network: failed request or HTTP error detected");}
 const shot=await invoke("browser_take_screenshot",{type:"png",fullPage:true})??await invoke("browser_screenshot",{});if(shot)evidence.screenshots.push({data:shot});
 const perf=await invoke("browser_evaluate",{function:"() => ({href:location.href,title:document.title,readyState:document.readyState,bodyTextLength:(document.body?.innerText||'').length,canvasCount:document.querySelectorAll('canvas').length,performance:performance.getEntriesByType('navigation').map((e)=>({duration:e.duration,domContentLoadedEventEnd:e.domContentLoadedEventEnd,loadEventEnd:e.loadEventEnd}))})"});if(perf)evidence.performance=perf;
 evidence.judgement={authoritative:true,passed:evidence.errors.length===0,assertions:assertions.length,errors:[...evidence.errors]};
 return evidence;
}
export function browserAdapterInfo(){return{browserbase:{configured:Boolean(process.env.BROWSERBASE_API_KEY),endpoint:"https://mcp.browserbase.com/mcp",mode:"hosted-stagehand-mcp",authoritative:false},playwright:{configured:Boolean(process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL),mode:"streamable-http-mcp",authoritative:true,recommendedCommand:"npm run playwright:mcp"}};}

import { mcpCallTool,mcpInitialize,mcpListTools } from "./mcp-http-client.js";
export type BrowserQaProvider="browserbase"|"playwright-mcp";
export type BrowserEvidence={provider:BrowserQaProvider;url:string;sessionId?:string;tools:string[];steps:Array<Record<string,unknown>>;console:Array<Record<string,unknown>>;network:Array<Record<string,unknown>>;screenshots:Array<Record<string,unknown>>;snapshot?:unknown;performance?:unknown;errors:string[]};
function configuredProvider(preferred?:BrowserQaProvider):BrowserQaProvider{if(preferred)return preferred;if(process.env.BROWSERBASE_API_KEY)return"browserbase";return"playwright-mcp";}
function browserbaseUrl(){const key=process.env.BROWSERBASE_API_KEY;if(!key)throw new Error("BROWSERBASE_API_KEY is not configured.");const url=new URL("https://mcp.browserbase.com/mcp");url.searchParams.set("browserbaseApiKey",key);url.searchParams.set("keepAlive","false");return url.toString();}
function playwrightUrl(){const url=process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL;if(!url)throw new Error("GAME_SHOP_PLAYWRIGHT_MCP_URL is not configured.");return url;}
function content(data:unknown){const root=data as Record<string,unknown>|null;const result=(root?.result??root) as Record<string,unknown>|undefined;return result?.structuredContent??result?.content??result??data;}
async function call(url:string,name:string,args:Record<string,unknown>,sessionId?:string){const r=await mcpCallTool({url,name,arguments:args,sessionId,timeoutMs:30000});return{sessionId:r.sessionId,data:content(r.data)};}
export async function executeBrowserQa(input:{url:string;provider?:BrowserQaProvider;interactions?:string[]}){const provider=configuredProvider(input.provider);const endpoint=provider==="browserbase"?browserbaseUrl():playwrightUrl();const init=await mcpInitialize({url:endpoint,timeoutMs:15000});const listed=await mcpListTools({url:endpoint,sessionId:init.sessionId,timeoutMs:15000});let sessionId=listed.sessionId;const names=new Set(listed.tools.map(t=>t.name));const evidence:BrowserEvidence={provider,url:input.url,sessionId,tools:[...names],steps:[],console:[],network:[],screenshots:[],errors:[]};
 const invoke=async(name:string,args:Record<string,unknown>={})=>{if(!names.has(name))return null;try{const r=await call(endpoint,name,args,sessionId);sessionId=r.sessionId??sessionId;evidence.sessionId=sessionId;evidence.steps.push({tool:name,ok:true});return r.data}catch(error){const message=error instanceof Error?error.message:String(error);evidence.errors.push(`${name}: ${message}`);evidence.steps.push({tool:name,ok:false,error:message});return null}};
 if(provider==="browserbase"){
  await invoke("start");await invoke("navigate",{url:input.url});
  const extracted=await invoke("extract",{instruction:"Inspect the page for visible error messages, broken or blank sections, missing primary content, obvious layout failures, and summarize the main interactive controls."});if(extracted)evidence.snapshot=extracted;
  for(const action of (input.interactions??[]).slice(0,8))await invoke("act",{action});
  const final=await invoke("extract",{instruction:"Return the current page title, main visible content, any error states, and whether primary controls appear usable."});if(final)evidence.snapshot=final;
  await invoke("end");return evidence;
 }
 await invoke("browser_navigate",{url:input.url});
 const snap=await invoke("browser_snapshot");if(snap)evidence.snapshot=snap;
 for(const action of (input.interactions??[]).slice(0,8)){
  if(names.has("browser_run_code"))await invoke("browser_run_code",{code:`async (page) => { /* QA intent: ${action.replace(/\*\//g,"")} */ return {url:page.url(),title:await page.title()}; }`});
 }
 const consoleData=await invoke("browser_console_messages",{level:"error"})??await invoke("browser_console_messages",{});if(consoleData)evidence.console.push({data:consoleData});
 const networkData=await invoke("browser_network_requests",{includeStatic:false})??await invoke("browser_network_requests",{});if(networkData)evidence.network.push({data:networkData});
 const shot=await invoke("browser_take_screenshot",{type:"png",fullPage:true})??await invoke("browser_screenshot",{});if(shot)evidence.screenshots.push({data:shot});
 const perf=await invoke("browser_evaluate",{function:"() => ({href:location.href,title:document.title,readyState:document.readyState,bodyTextLength:(document.body?.innerText||'').length,performance:performance.getEntriesByType('navigation').map((e)=>({duration:e.duration,domContentLoadedEventEnd:e.domContentLoadedEventEnd,loadEventEnd:e.loadEventEnd}))})"});if(perf)evidence.performance=perf;
 return evidence;
}
export function browserAdapterInfo(){return{browserbase:{configured:Boolean(process.env.BROWSERBASE_API_KEY),endpoint:"https://mcp.browserbase.com/mcp",mode:"hosted-stagehand-mcp"},playwright:{configured:Boolean(process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL),mode:"streamable-http-mcp",recommendedCommand:"npx @playwright/mcp@latest --headless --caps=network,testing,devtools --port 8931"}};}

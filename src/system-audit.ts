import { artifactStoreInfo } from "./artifacts.js";
import { browserFleetInfo } from "./browser-fleet.js";
import { capabilityTrustInfo } from "./capability-trust.js";
import { executionStoreInfo } from "./execution-store.js";
import { githubExecutionInfo } from "./github-execution.js";
import { integrationReadiness } from "./integration-runtime.js";
import { integrationRegistry } from "./integrations.js";
import { oauthReadiness } from "./oauth-readiness.js";
import { previewDeploymentInfo } from "./preview-deployment.js";
import { listProjects } from "./projects.js";
import { qaMemoryInfo } from "./qa-memory.js";
import { taskBridgeInfo } from "./task-bridge.js";

export type AuditSeverity="info"|"warning"|"critical";
export type AuditFinding={id:string;severity:AuditSeverity;area:string;status:"pass"|"attention"|"blocked";message:string;fix:string};

function finding(id:string,severity:AuditSeverity,area:string,status:AuditFinding["status"],message:string,fix:string):AuditFinding{return{id,severity,area,status,message,fix};}

export function gameShopSystemAudit(){
  const integrations=integrationRegistry();
  const readiness=integrationReadiness();
  const projects=listProjects();
  const github=githubExecutionInfo();
  const executionStore=executionStoreInfo();
  const artifactStore=artifactStoreInfo();
  const qaMemory=qaMemoryInfo();
  const trust=capabilityTrustInfo();
  const oauth=oauthReadiness();
  const browser=browserFleetInfo();
  const preview=previewDeploymentInfo();
  const tasks=taskBridgeInfo();
  const findings:AuditFinding[]=[];

  findings.push(github.configured
    ? finding("github-read","info","source-control","pass",`GitHub runtime credential is configured via ${github.credential}.`,"Keep write permission disabled until a controlled mutation mission is approved.")
    : finding("github-read","critical","source-control","blocked","Game Shop cannot inspect private project source from its cloud runtime.","Set GAME_SHOP_GITHUB_TOKEN to a fine-grained GitHub token with Metadata + Contents read access for registered repositories."));
  findings.push(github.writesAllowed
    ? finding("github-write","warning","source-control","attention","GitHub writes are enabled.","Retain gameshop/* branch and project-root enforcement; disable GAME_SHOP_ALLOW_GITHUB_WRITES outside controlled build windows if desired.")
    : finding("github-write","info","source-control","pass","GitHub writes remain explicitly locked.","Enable only for approved gameshop/* branch mutation missions."));
  findings.push(executionStore.durableAcrossColdStarts
    ? finding("execution-durability","info","state","pass","Execution state is durable across cold starts.","Keep migrations/versioning tested before schema changes.")
    : finding("execution-durability","critical","state","blocked","Execution handles are process-memory only.","Configure GAME_SHOP_SUPABASE_URL and GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY and apply the execution-store schema."));
  findings.push(artifactStore.durableAcrossColdStarts
    ? finding("artifact-durability","info","artifacts","pass","Artifact metadata is durable.","Also verify object storage persistence for provider binaries.")
    : finding("artifact-durability","critical","artifacts","blocked","Artifact metadata is process-memory fallback.","Configure the dedicated Game Shop Supabase store and artifact bucket."));
  findings.push(qaMemory.durableAcrossColdStarts
    ? finding("qa-memory","info","qa","pass","Regression memory survives cold starts.","Track recipe drift and retire flaky recipes automatically.")
    : finding("qa-memory","warning","qa","attention","QA recipes are process-memory fallback.","Configure durable Game Shop Supabase storage and apply QA_MEMORY_SQL."));
  findings.push(oauth.ready
    ? finding("oauth","info","auth","pass","OAuth PKCE runtime configuration is ready.","Add token revocation/rotation and enforce scopes at every MCP tool boundary.")
    : finding("oauth","critical","auth","blocked",`OAuth configuration is incomplete: ${oauth.missing.join(", ") || "unknown"}.`,"Configure the missing GAME_SHOP_OAUTH_* values before web-client authorization."));

  const callable=readiness.filter(item=>item.callableNow);
  const remotelyCallable=readiness.filter(item=>item.remotelyCallable);
  if(!process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS){findings.push(finding("external-lock","warning","integrations","attention","Remote integrations are catalogued but external execution is globally locked.","Enable GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS only when a mission explicitly needs live external calls."));}
  if(!process.env.GAME_SHOP_ALLOW_PAID_GENERATION){findings.push(finding("spend-lock","info","spend","pass","Potentially billable generation is locked.","Keep locked by default and grant per-mission billing authority rather than permanent global authority."));}
  if(!process.env.BROWSERBASE_API_KEY){findings.push(finding("browserbase","warning","qa","attention","Hosted exploratory Browserbase QA is not configured.","Set BROWSERBASE_API_KEY in the deployed runtime."));}
  if(!process.env.GAME_SHOP_PLAYWRIGHT_MCP_URL){findings.push(finding("playwright-mcp","warning","qa","attention","No standalone Playwright MCP URL is configured.","Run the standalone Playwright MCP worker or rely on the deterministic GitHub Actions lane."));}
  if(!preview.configured){findings.push(finding("preview","warning","deployment","attention","Preview deployment adapter has no runtime mapping/token.","Configure GAME_SHOP_VERCEL_PROJECTS_JSON and VERCEL_TOKEN or a deploy hook for each registered project."));}
  if(tasks.specification!=="2026-07-28"){findings.push(finding("tasks-spec","warning","protocol","attention",`Task bridge reports ${tasks.specification}.`,"Align Tasks extension behavior with MCP 2026-07-28."));}

  const byState=integrations.reduce<Record<string,number>>((acc,item)=>{acc[item.state]=(acc[item.state]??0)+1;return acc;},{});
  const byKind=integrations.reduce<Record<string,number>>((acc,item)=>{for(const kind of item.kinds)acc[kind]=(acc[kind]??0)+1;return acc;},{});
  const severityRank:Record<AuditSeverity,number>={critical:3,warning:2,info:1};
  findings.sort((a,b)=>severityRank[b.severity]-severityRank[a.severity]||a.area.localeCompare(b.area));

  return{
    schemaVersion:"1.0",
    generatedAt:new Date().toISOString(),
    posture:findings.some(f=>f.severity==="critical"&&f.status!=="pass")?"blocked-on-core-runtime":findings.some(f=>f.severity==="warning"&&f.status!=="pass")?"operational-with-gaps":"operational",
    summary:{projects:projects.length,integrations:integrations.length,callableIntegrations:callable.length,remotelyCallableIntegrations:remotelyCallable.length,findings:findings.length,critical:findings.filter(f=>f.severity==="critical"&&f.status!=="pass").length,warnings:findings.filter(f=>f.severity==="warning"&&f.status!=="pass").length},
    runtime:{github,oauth,executionStore,artifactStore,qaMemory,trust,browser,preview,tasks},
    integrations:{byState,byKind,readiness},
    projects,
    findings,
  };
}

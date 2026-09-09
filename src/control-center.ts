import { artifactStoreInfo, listArtifacts } from "./artifacts.js";
import { executionStoreInfo, resolveExecutions } from "./execution-store.js";
import { externalEngineStatus } from "./external-engines.js";
import { integrationRegistry } from "./integrations.js";
import { taskBridgeInfo } from "./task-bridge.js";
import { orchestrationSnapshot } from "./orchestrator.js";
import { qaWorkerInfo } from "./qa-worker.js";
import { qaSwarmInfo } from "./qa-swarm.js";
import { browserFleetInfo } from "./browser-fleet.js";
import { playwrightCiInfo } from "./playwright-ci.js";
import { capabilityTrustInfo,trustedCapabilities } from "./capability-trust.js";
import { previewDeploymentInfo } from "./preview-deployment.js";
import { nextGenIntegrations } from "./next-gen-integrations.js";

export async function controlCenterSnapshot(){const executions=await resolveExecutions();const artifacts=await listArtifacts();const integrations=integrationRegistry();const nextGen=nextGenIntegrations();const orchestration=await orchestrationSnapshot();const trusted=trustedCapabilities();const states=orchestration.rows.reduce<Record<string,number>>((acc,row)=>{const state=String((row.orchestration as Record<string,unknown>).state??"unknown");acc[state]=(acc[state]??0)+1;return acc;},{});return{schemaVersion:"1.5",app:{name:"Game Shop Control Center",resourceUri:"ui://game-shop/control-center",mcpAppsTarget:true},summary:{executions:executions.length,artifacts:artifacts.length,integrations:integrations.length+nextGen.length,mcpCapable:integrations.filter(i=>i.kinds.includes("mcp")||i.kinds.includes("desktop-mcp")).length+nextGen.filter(i=>i.kind.includes("mcp")).length,apiCapable:integrations.filter(i=>i.kinds.includes("api")).length+nextGen.filter(i=>i.kind.includes("api")).length,dynamicTrustedMcp:trusted.length,orchestrated:orchestration.count,orchestrationStates:states},stores:{executions:executionStoreInfo(),artifacts:artifactStoreInfo()},tasks:taskBridgeInfo(),engines:externalEngineStatus(),qa:{worker:qaWorkerInfo(),swarm:qaSwarmInfo(),fleet:browserFleetInfo(),playwrightCi:playwrightCiInfo()},preview:previewDeploymentInfo(),trust:{info:capabilityTrustInfo(),promoted:trusted},integrations:{catalog:integrations,nextGen},orchestration,recentExecutions:executions.slice(0,20),recentArtifacts:artifacts.slice(0,30)};}
export function controlCenterAppInfo(){return{extension:"io.modelcontextprotocol/apps",resourceUri:"ui://game-shop/control-center",status:"qa-swarm-release-gated",surfaces:["executions","tasks","artifacts","engines","integrations","persistence","placement","preview","browser-fleet","browserbase","playwright-mcp","playwright-ci","playwright-cli","chrome-devtools-mcp","qa-swarm","release-gate","verification","repair","patch-worker","capability-trust","orchestration"],pipeline:["provider","finalize","persist","assign","place","preview","browser-fleet-route","browserbase-live-qa","playwright-deterministic-qa","evidence-fusion","release-gate","repair-approval","patch","re-preview","re-qa","complete"],expansion:["discover","inspect","sandbox-test","score","approve","promote"]};}

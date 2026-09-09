import { artifactStoreInfo, listArtifacts } from "./artifacts.js";
import { executionStoreInfo, resolveExecutions } from "./execution-store.js";
import { externalEngineStatus } from "./external-engines.js";
import { integrationRegistry } from "./integrations.js";
import { taskBridgeInfo } from "./task-bridge.js";

export async function controlCenterSnapshot(){const executions=await resolveExecutions();const artifacts=await listArtifacts();const integrations=integrationRegistry();return{schemaVersion:"1.0",app:{name:"Game Shop Control Center",resourceUri:"ui://game-shop/control-center",mcpAppsTarget:true},summary:{executions:executions.length,artifacts:artifacts.length,integrations:integrations.length,mcpCapable:integrations.filter(i=>i.kinds.includes("mcp")||i.kinds.includes("desktop-mcp")).length,apiCapable:integrations.filter(i=>i.kinds.includes("api")).length},stores:{executions:executionStoreInfo(),artifacts:artifactStoreInfo()},tasks:taskBridgeInfo(),engines:externalEngineStatus(),recentExecutions:executions.slice(0,20),recentArtifacts:artifacts.slice(0,30)};}
export function controlCenterAppInfo(){return{extension:"io.modelcontextprotocol/apps",resourceUri:"ui://game-shop/control-center",status:"scaffolded",surfaces:["executions","tasks","artifacts","engines","integrations","verification","repair"],next:"Register the ui:// resource with the MCP Apps extension once the deployed MCP transport advertises Apps capability."};}

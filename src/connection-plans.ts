import { integrationStatus } from './integrations.js';

export type ConnectionMode = 'remote-mcp' | 'stdio-mcp' | 'rest-api' | 'library' | 'platform-api' | 'reference';

export function connectionPlan(id:string){
  const integration=integrationStatus(id);
  if(!integration)return null;
  const mode:ConnectionMode = integration.kinds.includes('mcp')
    ? (integration.endpoint ? 'remote-mcp' : 'stdio-mcp')
    : integration.kinds.includes('api')
      ? 'rest-api'
      : integration.kinds.includes('platform-api')
        ? 'platform-api'
        : integration.kinds.includes('library')
          ? 'library'
          : 'reference';
  const requiredEnv=(integration.env??[]).map(name=>({name,configured:Boolean(process.env[name])}));
  return {
    id:integration.id,
    name:integration.name,
    mode,
    state:integration.state,
    endpoint:integration.endpoint??null,
    install:integration.install??null,
    auth:integration.auth??null,
    requiredEnv,
    ready: integration.state==='ready' || integration.state==='installable' || (requiredEnv.length>0 && requiredEnv.every(e=>e.configured)),
    capabilities:integration.capabilities,
    notes:integration.notes,
  };
}

export function allConnectionPlans(){
  // Enumerate through the public registry so this stays in sync with integrations.ts.
  const { integrationRegistry } = requireIntegrationRegistry();
  return integrationRegistry().map((item:{id:string})=>connectionPlan(item.id));
}

function requireIntegrationRegistry(){
  // ESM-safe indirection without creating a circular eager import path in callers.
  return { integrationRegistry: () => (globalThis as any).__gameshopIntegrationRegistry?.() ?? [] };
}

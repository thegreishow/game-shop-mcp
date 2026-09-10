import type { IntegrationInvokeInput } from './integration-runtime.js';
import type { OperationClass } from './operation-policy.js';

export type BillingClass = 'free' | 'potentially-paid' | 'paid';
export type MutationClass = 'read' | 'write' | 'destructive';
export type IntegrationOperationPolicy = {
  billing: BillingClass;
  mutation: MutationClass;
  operationClass: OperationClass;
};

type ApiRule = { method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; path: RegExp; policy: IntegrationOperationPolicy };
type McpRule = { tools: string[]; policy: IntegrationOperationPolicy };
type Policy = { api?: ApiRule[]; mcp?: McpRule[] };
const READ: IntegrationOperationPolicy = { billing:'free', mutation:'read', operationClass:'read' };
const GENERATE: IntegrationOperationPolicy = { billing:'potentially-paid', mutation:'write', operationClass:'generate' };
const WRITE: IntegrationOperationPolicy = { billing:'free', mutation:'write', operationClass:'write' };

const POLICIES: Record<string, Policy> = {
  '21st-dev': { mcp:[{tools:['list_components','search_components','get_component','listRegistryItems','searchRegistryItems','getRegistryItem'],policy:READ}] },
  'motion-ai-kit': { mcp:[{tools:['search_docs','search_examples','audit_performance','generate_css'],policy:READ}] },
  'motion-so': { mcp:[{tools:['list_sessions','get_session','get_session_status'],policy:READ},{tools:['create_session','create_video','followup'],policy:GENERATE}], api:[{method:'GET',path:/^sessions(?:\/[^/?]+)?(?:\?.*)?$/i,policy:READ},{method:'POST',path:/^sessions\/?$/i,policy:GENERATE}] },
  'raylight-mcp': { mcp:[{tools:['list_projects','get_project','read_shot','render_frames'],policy:READ},{tools:['edit_shot','edit_animation'],policy:WRITE}] },
  'ludo-ai': { mcp:[{tools:['getApiJob','getJob','listJobs','getHistory','getDocs'],policy:READ},{tools:['createImage','editImage','generateWithStyle','generatePose','removeBackground','create3DModel','animateSprite','animateSpriteKeyframes','editSpritesheet','createVideo','createVideoFromReferences','editVideo','upscaleVideo','createSoundEffect','createMusic','createVoice','createSpeech','createSpeechPreset'],policy:GENERATE}] },
  'meshy': { api:[{method:'GET',path:/^openapi\/v2\/(?:text-to-3d|image-to-3d)\/[A-Za-z0-9_-]+$/i,policy:READ},{method:'POST',path:/^openapi\/v2\/(?:text-to-3d|image-to-3d)$/i,policy:GENERATE}], mcp:[{tools:['get_task','get_model','list_tasks'],policy:READ},{tools:['text_to_3d','image_to_3d','texture_3d'],policy:GENERATE}] },
  'fal-ai': { mcp:[{tools:['search','find_models','model_schema','get_result','status'],policy:READ},{tools:['run','submit','upload'],policy:GENERATE}] },
  'replicate': { api:[{method:'GET',path:/^v1\/(?:predictions\/[A-Za-z0-9_-]+|models(?:\/.*)?)$/i,policy:READ},{method:'POST',path:/^v1\/predictions\/?$/i,policy:GENERATE}], mcp:[{tools:['search_models','get_model','get_prediction'],policy:READ},{tools:['create_prediction','run_model'],policy:GENERATE}] },
  'elevenlabs': { mcp:[{tools:['list_voices','get_voice','list_models','get_history'],policy:READ},{tools:['text_to_speech','speech_to_speech','sound_effects','music','generate_audio'],policy:GENERATE}] },
  'preline-ui': { mcp:[{tools:['list_components','get_component','list_blocks','get_docs'],policy:READ}] },
  'daisyui-mcp': { mcp:[{tools:['list_components','get_component','search_components'],policy:READ}] },
  'motionsites-mcp': { mcp:[{tools:['search','get_prompt','get_reference','list_references'],policy:READ}] },
  'unison-brain': { mcp:[{tools:['search','fetch','status','facts','recall'],policy:READ},{tools:['remember','write','edit','ingest'],policy:WRITE}] },
  'manus-custom-mcp': { mcp:[{tools:['list_tools','list_resources'],policy:READ}] },
  'manus-api': { api:[{method:'GET',path:/^(?:v2\/)?(?:tasks|projects|files)(?:\/[^/?]+)?(?:\?.*)?$/i,policy:READ},{method:'POST',path:/^(?:v2\/)?tasks\/?$/i,policy:GENERATE}] },
  'podium': { api:[{method:'GET',path:/^(?:products|creators|users|orders|campaigns|rewards|search)(?:\/.*)?$/i,policy:READ},{method:'POST',path:/^(?:orders|payments|campaigns|rewards)(?:\/.*)?$/i,policy:WRITE}] },
  'browserbase-mcp': { mcp:[{tools:['start','navigate','observe','extract','screenshot','end'],policy:READ},{tools:['act'],policy:WRITE}] },
  'playwright-mcp': { mcp:[{tools:['browser_navigate','browser_snapshot','browser_console_messages','browser_network_requests','browser_take_screenshot'],policy:READ},{tools:['browser_click','browser_type','browser_press_key'],policy:WRITE}] },
  'chrome-devtools-mcp': { mcp:[{tools:['navigate_page','take_snapshot','take_screenshot','list_console_messages','list_network_requests','lighthouse_audit','performance_start_trace','performance_stop_trace'],policy:READ}] },
};

export function integrationOperationPolicy(input: IntegrationInvokeInput): IntegrationOperationPolicy {
  if (input.mode === 'mcp-list-tools') return READ;
  const policy = POLICIES[input.id];
  if (!policy) throw new Error(`No explicit external-operation allowlist is registered for ${input.id}.`);
  if (input.mode === 'mcp-call') {
    if (!input.tool) throw new Error('tool is required for mcp-call.');
    const rule = policy.mcp?.find(candidate => candidate.tools.includes(input.tool!));
    if (!rule) throw new Error(`MCP tool ${input.tool} is not allowlisted for ${input.id}.`);
    return rule.policy;
  }
  const method = input.method ?? 'GET';
  const path = String(input.path ?? '').replace(/^\//,'');
  const rule = policy.api?.find(candidate => candidate.method === method && candidate.path.test(path));
  if (!rule) throw new Error(`${method} ${path || '/'} is not allowlisted for ${input.id}.`);
  return rule.policy;
}

export function integrationPolicyInfo() {
  return {
    default: 'deny',
    registeredIntegrations: Object.keys(POLICIES).sort(),
    billingClasses: ['free','potentially-paid','paid'] as BillingClass[],
    mutationClasses: ['read','write','destructive'] as MutationClass[],
    rule: 'Unknown MCP tools, REST paths and methods are blocked even when external network access is enabled.',
  };
}

export function heuristicBillingBrake(input: IntegrationInvokeInput) {
  const operation = `${input.tool ?? ''} ${input.path ?? ''}`.toLowerCase();
  return /(generate|create|render|prediction|session|speech|music|video|image|audio|3d|animate|train|upscale)/.test(operation);
}

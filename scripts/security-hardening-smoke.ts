import assert from 'node:assert/strict';
import { requiredScopesForTool } from '../src/security.js';
import { integrationOperationPolicy } from '../src/integration-policy.js';
import { operationAllowed } from '../src/operation-policy.js';
import { enforceDistributedRateLimit } from '../src/distributed-rate-limit.js';
import { githubReadProjectFile, githubCreateProjectBranch, githubUpsertProjectBytes } from '../src/github-execution.js';
import { invokeIntegration } from '../src/integration-runtime.js';
import { logEvent, listEvents } from '../src/governance-ledger.js';
import { canCommitAsset, transitionAssetStage } from '../src/asset-policy.js';

async function rejects(fn:()=>unknown|Promise<unknown>,pattern:RegExp){await assert.rejects(async()=>fn(),pattern);}

async function main(){
  delete process.env.GAME_SHOP_ALLOW_GITHUB_WRITES;
  delete process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
  delete process.env.GAME_SHOP_ALLOW_GENERATION;
  delete process.env.GAME_SHOP_ALLOW_EXTERNAL_WRITES;
  delete process.env.GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS;
  delete process.env.GAME_SHOP_ALLOW_DEPLOY;
  delete process.env.GAME_SHOP_ALLOW_PAID_GENERATION;
  delete process.env.GAME_SHOP_SUPABASE_URL;
  delete process.env.GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY;

  // Project/path confinement must reject traversal before any GitHub network access.
  await rejects(()=>githubReadProjectFile({projectId:'dubai-legends',path:'../secrets.txt'}),/Invalid repository path|escapes/);
  await rejects(()=>githubReadProjectFile({projectId:'dubai-legends',path:'core/../../../index.html'}),/Invalid repository path|escapes/);

  // GitHub writes are opt-in and invalid/non-Game-Shop branches never pass write policy.
  await rejects(()=>githubCreateProjectBranch({projectId:'dubai-legends',branch:'feature/unsafe'}),/GitHub writes are disabled/);
  process.env.GAME_SHOP_ALLOW_GITHUB_WRITES='true';
  await rejects(()=>githubCreateProjectBranch({projectId:'dubai-legends',branch:'feature/unsafe'}),/Game Shop branches must start with gameshop\//);
  delete process.env.GAME_SHOP_ALLOW_GITHUB_WRITES;

  // Oversized binary placement fails before GitHub mutation/network access.
  await rejects(()=>githubUpsertProjectBytes({projectId:'dubai-legends',path:'assets/huge.bin',bytes:new Uint8Array(20*1024*1024+1),message:'test',branch:'gameshop/test'}),/exceeds the 20 MB/);

  // Least-privilege OAuth scope mapping.
  assert.deepEqual(requiredScopesForTool('gameshop_github_read_file'),['gameshop.github.read']);
  assert.deepEqual(requiredScopesForTool('gameshop_github_upsert_file'),['gameshop.github.write']);
  assert.deepEqual(requiredScopesForTool('gameshop_generate_character'),['gameshop.generate']);
  assert.deepEqual(requiredScopesForTool('gameshop_invoke_integration'),['gameshop.integrations.invoke']);
  assert.deepEqual(requiredScopesForTool('gameshop_integrations'),['gameshop.integrations.read']);
  assert.deepEqual(requiredScopesForTool('gameshop_create_preview_deployment'),['gameshop.deploy']);

  // External operation allowlists are default-deny and declaratively classify billing/mutation.
  assert.equal(integrationOperationPolicy({id:'meshy',mode:'api',method:'GET',path:'openapi/v2/text-to-3d/task_1'}).billing,'free');
  assert.equal(integrationOperationPolicy({id:'meshy',mode:'api',method:'POST',path:'openapi/v2/text-to-3d'}).billing,'potentially-paid');
  assert.throws(()=>integrationOperationPolicy({id:'meshy',mode:'api',method:'DELETE',path:'openapi/v2/text-to-3d/task_1'}),/not allowlisted/);
  assert.throws(()=>integrationOperationPolicy({id:'elevenlabs',mode:'mcp-call',tool:'delete_everything'}),/not allowlisted/);

  // Dangerous operation classes remain disabled by default.
  assert.equal(operationAllowed('read'),true);assert.equal(operationAllowed('generate'),false);assert.equal(operationAllowed('write'),false);assert.equal(operationAllowed('destructive'),false);assert.equal(operationAllowed('deploy'),false);

  // Master external-call lock must fail before auth/provider network behavior.
  await rejects(()=>invokeIntegration({id:'meshy',mode:'mcp-list-tools'}),/External integrations are disabled/);

  // Asset lifecycle must prevent unreviewed/intermediate Git promotion.
  assert.equal(canCommitAsset({stage:'generated',bytes:100}).allowed,false);
  assert.equal(canCommitAsset({stage:'production',bytes:100,reviewed:false}).allowed,false);
  assert.equal(canCommitAsset({stage:'production',bytes:100,reviewed:true}).allowed,true);
  assert.throws(()=>transitionAssetStage({from:'generated',to:'optimized'}),/one stage/);

  // Secret-bearing event fields are scrubbed before persistence/response.
  await logEvent({type:'security.test',data:{apiKey:'do-not-leak',nested:{authorization:'Bearer secret'},safe:'visible'}});
  const event=(await listEvents({limit:1}))[0] as any;
  const serialized=JSON.stringify(event);
  assert.doesNotMatch(serialized,/do-not-leak|Bearer secret/);
  assert.match(serialized,/\[redacted\]/);

  // In-memory rate limiter remains a fallback and isolates authenticated client identities.
  process.env.GAME_SHOP_RATE_LIMIT_READ_PER_MINUTE='2';
  const req=()=>new Request('http://localhost/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'gameshop_list_projects',arguments:{}}})});
  const a1=await enforceDistributedRateLimit(req(),{mode:'oauth',clientId:'client-a',subject:'owner'});const a2=await enforceDistributedRateLimit(req(),{mode:'oauth',clientId:'client-a',subject:'owner'});const a3=await enforceDistributedRateLimit(req(),{mode:'oauth',clientId:'client-a',subject:'owner'});const b1=await enforceDistributedRateLimit(req(),{mode:'oauth',clientId:'client-b',subject:'owner'});
  assert.equal(a1.ok,true);assert.equal(a2.ok,true);assert.equal(a3.ok,false);assert.equal(b1.ok,true);

  console.log('Security hardening smoke OK: scope, path, branch, external, billing, asset, secret and rate-limit safety verified.');
}
main().catch(error=>{console.error(error);process.exit(1);});

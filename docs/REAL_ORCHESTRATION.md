# Real Orchestration — SDK Hub Phase 2

Game Shop now has a real provider-orchestration layer rather than only provider discovery/configuration.

## Canonical runtime files

- `src/sdk-hub.ts` — SDK package metadata, auth contracts, lazy loading and route priorities.
- `src/provider-adapters-v2.ts` — one adapter contract for fal, Replicate, ElevenLabs, Scenario and Cloudinary.
- `src/provider-health-v2.ts` — provider readiness, blockers and health scoring.
- `src/normalized-output.ts` — cross-provider job/status/asset normalization.
- `src/real-orchestration.ts` — capability routing + one-provider execution + continuation.
- `src/register-sdk-tools.ts` — MCP tools exposing the layer to any compatible LLM.
- `src/orchestrator.ts` — downstream artifact persistence, placement, verification, preview, QA and repair approval.

## What "real orchestration" means here

A caller can ask for a capability such as `image-generation`, `speech-generation`, `3d-generation`, `upscaling`, `asset-upload` or `asset-management` without hard-coding one provider into the calling agent.

Game Shop then:

1. reads the provider capability/routing matrix;
2. consults versioned provider-health/blocker data;
3. checks local credential readiness without exposing secrets;
4. chooses an eligible adapter;
5. invokes exactly one provider when execution is explicitly requested;
6. normalizes provider output into a common status/job/assets model;
7. attaches provider work to the universal artifact lifecycle where the provider adapter supports it;
8. continues asynchronous provider jobs through a separate continuation tool;
9. hands ready artifacts into the existing persistence/place/verify/preview/browser-QA pipeline.

## Spend and fallback safety

Paid generation remains disabled unless:

```text
GAME_SHOP_ALLOW_PAID_GENERATION=true
```

The Phase 2 fallback policy is intentionally **route-before-submit only**. Game Shop can choose another provider before a billable request, but it will not silently submit the same prompt to another provider after an ambiguous provider error. An HTTP/network failure after submission may still have created a paid job; automatic retries across vendors could double-spend.

If an invocation fails, Game Shop returns eligible alternatives and requires the caller/human to decide whether the first provider created a job before retrying elsewhere.

## MCP tools

The SDK/orchestration surface is exposed from the same `/api/mcp` handler; no extra Vercel serverless function is created.

- `gameshop_sdk_hub_status` — SDKs, versions, capabilities, auth variable names and adapters.
- `gameshop_provider_health` — scored readiness/blocker snapshot.
- `gameshop_real_orchestration_info` — routing/fallback/spend contract.
- `gameshop_plan_provider_task` — route only; no provider call.
- `gameshop_run_provider_task` — real execution; requires `execute: true` and still respects the paid-generation lock.
- `gameshop_continue_provider_task` — poll/finalize fal, Replicate and ElevenLabs asynchronous jobs.

Existing artifact tools remain available for persistence, placement and QA.

## Provider payload contracts

The orchestration layer is provider-neutral for capability selection but intentionally keeps provider-specific payloads explicit. This prevents Game Shop from inventing or silently translating unsupported provider parameters.

### fal

```json
{
  "model": "provider/model-id",
  "input": {}
}
```

### Replicate

```json
{
  "version": "model-version-id",
  "input": {}
}
```

### ElevenLabs speech

```json
{
  "text": "...",
  "voice": "voice-id",
  "modelId": "optional-model-id"
}
```

### Scenario

```json
{
  "modelId": "model_...",
  "body": {}
}
```

### Cloudinary upload

```json
{
  "source": "https://... or local/server-readable source",
  "folder": "optional/folder",
  "publicId": "optional-id"
}
```

## Current blockers represented in routing

- Replicate: adapter/SDK present, but authenticated account verification remains deferred/failing; health scoring prevents treating it as the preferred healthy route until re-verified.
- Scenario: SDK installed; key + secret remain plan/auth dependent.
- Kibo: provider-side MCP HTTP 500, represented as vendor-blocked.
- ContextCore: local-runtime integration; hosted orchestration does not assume the desktop stdio wrapper exists.
- Spline and WanGP: local runtime/app dependencies remain opt-in.

## Cross-LLM use

Any compatible LLM should read, in order:

1. `AGENTS.md`
2. `ecosystem.json`
3. `mcp.json`
4. `docs/STANDALONE_PORTABILITY.md`
5. this file
6. `llm-handoff/manifest.json`

Then use the Game Shop MCP as the preferred orchestration surface while retaining direct provider MCP/API/SDK access as a fallback or debugging path.

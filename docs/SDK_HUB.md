# SDK Hub — Phase 2

Game Shop keeps MCP, API and SDK access as separate layers. The SDK Hub adds direct provider SDK access while preserving direct provider use outside Game Shop.

## Phase 2 providers

| Provider | Official package | Version contract | Env | API base | Primary role |
|---|---|---:|---|---|---|
| Replicate | `replicate` | `^1.4.0` | `REPLICATE_API_TOKEN` | `https://api.replicate.com/v1` | model inference, image/video/audio/3D |
| fal | `@fal-ai/client` | `^1.10.1` | `FAL_KEY` | `https://queue.fal.run` | queue-backed multimodal generation |
| ElevenLabs | `@elevenlabs/elevenlabs-js` | `^2.68.0` | `ELEVENLABS_API_KEY` | `https://api.elevenlabs.io/v1` | speech/audio/media APIs |
| Scenario | `@scenario-labs/sdk` | `^3.1.0` | `SCENARIO_API_KEY`, `SCENARIO_API_SECRET` | `https://api.cloud.scenario.com/v1` | game-art/media generation and asset management |
| Cloudinary | `cloudinary` | `^2.11.0` | `CLOUDINARY_URL` | `https://api.cloudinary.com` | artifact upload, transformation and delivery |

The package/version/auth/base-URL records above are also represented in `src/sdk-hub.ts`, `ecosystem.json` and the generated snapshot.

## Architecture

`src/sdk-hub.ts` provides the canonical SDK registry, capability routing, readiness checks, lazy dynamic imports and provider client construction.

Phase 2 adds:

- `src/provider-adapters-v2.ts` — unified adapter contract around established REST paths plus SDK-backed operations.
- `src/provider-health-v2.ts` — scored readiness and known-blocker representation.
- `src/normalized-output.ts` — common job/status/asset result shape.
- `src/real-orchestration.ts` — real provider selection and execution.
- `src/register-sdk-tools.ts` — MCP exposure for any compatible LLM.

The established REST operations in `src/external-engines.ts` now sit behind the Phase 2 adapter surface instead of being called directly by a new agent. This lets SDK-specific implementations replace them incrementally without changing the orchestration contract.

## Spend lock

Any existing provider generation adapter already calls `assertPaidGenerationAllowed()` before the billable provider request. SDK-native generation helpers must use `executeSdkGeneration()`, which applies the same lock immediately before the provider callback.

Paid generation remains blocked unless:

```text
GAME_SHOP_ALLOW_PAID_GENERATION=true
```

Cloudinary upload is a provider mutation rather than a model generation request; storage/bandwidth/account charges can still apply.

## Routing priorities

Phase 2 default priorities are versioned in `src/sdk-hub.ts` and `src/real-orchestration.ts`.

- general inference: fal → Replicate
- image/video: fal → Scenario → Replicate → ElevenLabs
- audio: ElevenLabs → fal → Scenario → Replicate
- speech: ElevenLabs
- 3D: Scenario → fal → Replicate
- upscaling: Replicate → fal → Scenario
- artifact upload/delivery: Cloudinary

Health scoring can demote a configured provider when a known blocker is active. Replicate, for example, remains installed but is marked auth-deferred until account verification succeeds.

## Fallback safety

Automatic fallback is **pre-submit only**. Game Shop does not silently submit an ambiguous failed generation to a second provider, because the first provider may already have created a billable job.

Failed execution returns ranked alternatives instead. A caller should verify whether the first provider created a job before explicitly retrying elsewhere.

## Installation and verification

```bash
npm run setup:sdk-hub
npm run verify:standalone
```

The setup installs repository-pinned SDK dependencies, validates TypeScript, runs non-billable SDK/provider-health smokes and refreshes `ecosystem.json` + `mcp.json`.

For a completely new machine/LLM:

```bash
npm run bootstrap:universal
```

## Current deferred conditions

Replicate authentication remains deferred. Scenario API execution remains deferred until both key and secret are configured on a compatible plan. Those conditions are represented in provider health rather than blocking the rest of the SDK Hub.

# SDK Hub — Phase 1

Game Shop keeps MCP, API and SDK access as separate layers. The SDK Hub adds direct provider SDK access without making Game Shop a mandatory path for standalone provider use.

## Phase 1 providers

| Provider | Official package | Env | Primary role |
|---|---|---|---|
| Replicate | `replicate` | `REPLICATE_API_TOKEN` | model inference, image/video/audio/3D |
| fal | `@fal-ai/client` | `FAL_KEY` | model inference, queue-backed media generation |
| ElevenLabs | `@elevenlabs/elevenlabs-js` | `ELEVENLABS_API_KEY` | speech/audio and media APIs |
| Scenario | `@scenario-labs/sdk` | `SCENARIO_API_KEY`, `SCENARIO_API_SECRET` | game-art/media generation and asset management |
| Cloudinary | `cloudinary` | `CLOUDINARY_URL` | artifact upload, transformation and delivery |

## Architecture

`src/sdk-hub.ts` provides a canonical SDK provider registry, capability routing, readiness checks, lazy dynamic SDK loading, provider client construction, and separate read/generation execution helpers. Startup and status checks never call provider generation endpoints.

## Spend lock

Any SDK operation capable of creating a billable generation job must go through `executeSdkGeneration()`. It calls the existing `assertPaidGenerationAllowed()` immediately before the provider callback. Paid generation remains blocked unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`.

Cloudinary artifact lifecycle operations are not classified as generative-model calls, though normal provider account/storage/bandwidth charges may still apply.

## Installation

```bash
npm run setup:sdk-hub
```

The setup installs the five official SDK packages, runs TypeScript validation, and executes a non-billable smoke test.

## Current deferred conditions

Replicate can be installed while token authentication is deferred; requests fail closed until a working token exists. Scenario client construction requires both API key and secret. The SDK Hub does not remove the existing REST/MCP adapters in `external-engines.ts`; later phases can migrate high-value operations behind the SDK Hub while preserving REST fallback paths.

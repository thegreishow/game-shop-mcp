# SDK Hub Phase 2 / Standalone Status

## Implemented

- Full verified integration capability catalog remains canonical in `src/integrations.ts`.
- Five-provider SDK Hub with package/version/install/auth/base-URL metadata.
- Unified adapters for fal, Replicate, ElevenLabs, Scenario and Cloudinary.
- Provider health scoring and explicit blocker states.
- Normalized provider output model for job IDs, status and assets.
- Real capability routing and execution with explicit provider-specific payloads.
- Live external execution lock: `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true`.
- Paid-generation lock: `GAME_SHOP_ALLOW_PAID_GENERATION=true`.
- Pre-submit-only fallback policy to prevent duplicate spend.
- MCP tools for SDK status, provider health, planning, real execution and async continuation.
- Universal artifact JSON schema plus existing persistence/place/verify/preview/browser-QA orchestration.
- `ecosystem.json` + `mcp.json` machine-readable snapshots and generator.
- Universal bootstrap and LLM handoff bundle for Grok/Grokbot/Claude/Gemini/Codex.
- CI coverage for SDK Hub smoke, provider health and snapshot generation.

## Known deferred / external blockers

- Replicate authentication verification remains unresolved; adapter is present but health scoring treats it as deferred.
- Scenario API execution requires API key + secret on a compatible plan.
- Kibo official MCP endpoint remains vendor-blocked with HTTP 500.
- ContextCore, Spline and WanGP require local runtime/app state and are not assumed by the hosted Game Shop runtime.
- Ludo auth remains optional/deferred.

## What remains before calling standalone ~100%

1. Verify the Phase 2 branch against current `main` and reconcile branch divergence.
2. Run the full bootstrap locally so `ecosystem.json` and `mcp.json` are regenerated from the live registry and commit the refreshed snapshots.
3. Re-verify Replicate auth or leave it permanently marked deferred.
4. Add provider-native SDK implementations incrementally where they improve reliability over the established REST adapter path.
5. Add richer live health telemetry (latency/error-rate/circuit-breaker history) without making health checks billable.
6. Expand normalized artifact extraction with provider-specific MIME/asset metadata.
7. Extend real orchestration beyond the first five SDK providers once their contracts are trustworthy.

The architecture is now portable and operational: another LLM can clone the repo, run `npm run bootstrap:universal`, read `AGENTS.md`/`ecosystem.json`/`mcp.json`, and continue without relying on ChatGPT conversation history.

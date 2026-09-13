# Real Orchestration Phase 3

Phase 3 turns provider routing from static readiness into an adaptive, resumable execution loop.

## Adaptive routing

Game Shop records provider submit/poll latency, request success/failure, consecutive failures, and downstream pipeline QA outcomes in the governance event ledger. The router combines that learned performance with the existing static provider-health score.

Three consecutive recent request failures open a 10-minute circuit breaker. After cooldown the provider enters half-open probe mode. Healthy providers earn modest score bonuses for high success rates and low latency; repeated failures and poor downstream QA reduce their route score.

This never bypasses the existing gates:

- `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true`
- `GAME_SHOP_ALLOW_PAID_GENERATION=true` for billable generation
- `GAME_SHOP_ALLOW_GITHUB_WRITES=true` for repository mutation

## Autonomous pipeline

`gameshop_run_autonomous_pipeline` performs:

`adaptive route -> provider submit -> bounded poll -> artifact finalization -> persistence -> project placement -> verification -> preview -> browser QA`

fal, Replicate, and ElevenLabs receive bounded immediate polling. Non-terminal work is left for the scheduled provider reconciler, which now resumes ready/waiting artifact orchestration after each reconciliation sweep.

Preview-not-ready states get bounded safe retries without regenerating assets or changing code. A still-blocked preview remains resumable instead of being incorrectly marked complete.

## Repair boundary

Evidence-driven code repair still requires the constrained patch worker and GitHub write gate. Phase 3 automates transient retry/resume behavior, but it does not silently invent or apply arbitrary code patches after QA failures.

## Observability

New MCP surface:

- `gameshop_provider_performance`
- `gameshop_run_autonomous_pipeline`

Existing provider planning now exposes learned performance, route-score adjustment, and circuit-breaker state for each candidate.

## Validation

`npm run test:orchestration-v3` seeds non-billable in-memory telemetry, verifies circuit-breaker behavior, confirms an open circuit is removed from eligibility, and verifies the autonomous-pipeline contract. It makes zero provider requests.

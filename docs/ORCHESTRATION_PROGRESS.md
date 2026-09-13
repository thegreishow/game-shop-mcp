# Orchestration Progress

## Now implemented

- capability-first routing across the five SDK Hub providers
- provider health scoring + blocker-aware eligibility
- explicit provider-specific payloads
- one-provider live invocation through adapters
- async continuation for fal / Replicate / ElevenLabs
- normalized provider output
- artifact registration hooks
- ready-artifact persist/place/verify/preview/browser-QA pipeline
- external-execution and paid-generation gates
- safe fallback policy that avoids duplicate billable submissions
- MCP exposure for planning and execution

## Next quality increments

- provider-native SDK implementations where they outperform current REST adapters
- provider-specific live read-only health probes and latency history
- circuit-breaker/error-rate state
- richer normalized asset metadata
- additional providers beyond the first five SDK Hub adapters
- automatic artifact target-path recommendations by project type
- cross-provider cost/latency/quality telemetry when trustworthy data is available

The platform has moved from catalog/configuration orchestration into actual provider execution orchestration. Remaining work is depth and reliability, not the absence of an orchestration path.

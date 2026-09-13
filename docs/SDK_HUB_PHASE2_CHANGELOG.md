# SDK Hub Phase 2 change summary

- Added versioned SDK package metadata for Replicate, fal, ElevenLabs, Scenario and Cloudinary.
- Added unified Phase 2 provider adapters.
- Added provider health scoring and blocker states.
- Added normalized provider output model.
- Added real capability routing and one-provider execution.
- Preserved external-integration and paid-generation gates.
- Added explicit pre-submit-only fallback policy.
- Exposed SDK status, provider health, planning, real execution and continuation as MCP tools on the existing `/api/mcp` handler.
- Added artifact JSON Schema.
- Added ecosystem and MCP snapshots plus generator.
- Added universal bootstrap and cross-LLM handoff configuration.
- Expanded CI and smoke checks.

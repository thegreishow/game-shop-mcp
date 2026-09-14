# Game Shop agent instructions

Read this file first when taking over the repository from another LLM or coding agent.

## Mission

Game Shop is an orchestration layer over MCPs, APIs, SDKs, CLIs, libraries, artifact lifecycles and local runtimes. It must never become a mandatory dependency for direct provider access.

## Core rules

- Keep provider integrations independently usable where the upstream provider supports it.
- Never commit, echo or place secret values in handoff bundles. `.env.example` contains names only.
- Keep `GAME_SHOP_ALLOW_PAID_GENERATION` disabled by default.
- Any provider request that can create billable generation must call `assertPaidGenerationAllowed()` immediately before the provider request.
- Do not automatically resubmit an ambiguous paid generation to a fallback provider; a failed network response can still represent a created/billable job.
- Do not mislabel SDKs/APIs/libraries/CLIs as MCPs.
- Preserve artifact capture, routing, provider health, normalization and explicit fallback behavior when migrating adapters.
- Prefer lazy SDK imports so optional providers do not become hard runtime dependencies until actually used.
- Treat vendor-blocked and local-runtime integrations as explicit states, not implementation bugs.
- Route game work through the smallest specialist set that satisfies the task; do not migrate engines merely because another engine is available.
- Route website work through the smallest stack that satisfies the task; do not add backend, commerce or 3D/shader infrastructure merely because it is available.
- For existing games and websites, inspect the real project first and prefer evidence-backed incremental repair over rewrites or migrations.
- Update `ecosystem.json`, `mcp.json` and the LLM handoff manifest whenever provider contracts, routing or status change.

## Canonical files

- `ecosystem.json` — machine-readable ecosystem snapshot. Refresh with `npm run snapshot:ecosystem`.
- `mcp.json` — portable Game Shop + direct-provider MCP map.
- `llm-handoff/manifest.json` — machine-readable project/handoff map.
- `llm-handoff/agent-config.json` — compact agent commands, read order and rules.
- `docs/GAME_WORKFLOW_ORCHESTRATION.md` — dedicated game-production traffic controller.
- `docs/WEBSITE_WORKFLOW_ORCHESTRATION.md` — dedicated website-production traffic controller.
- `docs/STANDALONE_PORTABILITY.md` — direct-vs-Game-Shop architecture and handoff process.
- `docs/SDK_HUB.md` — SDK Hub design/status.
- `docs/REAL_ORCHESTRATION.md` — real provider routing/execution contract.
- `src/game-workflow-router.ts` — game specialist routing policy.
- `src/website-workflow-router.ts` — website type/need routing policy.
- `src/integrations.ts` — full verified integration capability catalog.
- `src/sdk-hub.ts` — SDK package/version/auth/base-URL data, lazy loaders and route priorities.
- `src/provider-adapters-v2.ts` — unified Phase 2 provider adapter contract.
- `src/provider-health-v2.ts` — readiness, blocker and health scoring.
- `src/normalized-output.ts` — common provider output normalization.
- `src/real-orchestration.ts` — real capability routing and one-provider execution.
- `src/external-engines.ts` — established REST execution paths behind the Phase 2 adapters while SDK-specific migrations continue.
- `src/artifacts.ts` + `schemas/artifact.schema.json` — universal artifact lifecycle contract.
- `src/orchestrator.ts` — persist/place/verify/preview/browser-QA/repair pipeline for ready artifacts.
- `src/spend.ts` — paid-generation lock.
- `src/security.ts` — gateway auth/security controls.
- `.env.example` — non-secret configuration contract.

## Universal bootstrap

On a new machine or with a new coding agent:

```bash
npm run bootstrap:universal
```

This installs repository-pinned dependencies, creates a secret-free `.env.local` template when needed, validates TypeScript, runs non-billable SDK/provider-health smokes, regenerates snapshots and creates the LLM handoff bundle.

## Preferred workflow routing

For game work, start with:

1. `gameshop_route_game_workflow`
2. `gameshop_game_workflow_matrix` when you need the full lane map

For website work, start with:

1. `gameshop_route_website_workflow`
2. `gameshop_website_workflow_matrix` when you need the full website-type/default-needs map

Routing tools are read-only. They do not authorize writes, external execution, paid generation or production deployment.

## Preferred real-orchestration flow

1. `gameshop_provider_health`
2. `gameshop_sdk_hub_status`
3. `gameshop_plan_provider_task`
4. `gameshop_run_provider_task` with `execute: true` only when execution is explicitly intended
5. `gameshop_continue_provider_task` for async jobs
6. `gameshop_orchestrate_artifact` / `gameshop_orchestrate_ready` for persistence, placement and QA

## Handoff

Run `npm run handoff:llm` to generate `dist/llm-handoff/`. This is the preferred portable context package for Grok/Grokbot/Claude/Gemini/Codex when direct repository access is unavailable.

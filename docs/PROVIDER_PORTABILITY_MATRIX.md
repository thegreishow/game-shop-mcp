# Provider Portability Matrix

This document explains where provider data is stored and how another LLM should consume it.

| Data | Canonical versioned source | Machine-readable output |
|---|---|---|
| Full provider capabilities/domains/kinds | `src/integrations.ts` | `ecosystem.json.integrations` after `npm run snapshot:ecosystem` |
| SDK package/version/install/auth/base URL | `src/sdk-hub.ts` | `ecosystem.json.sdk` |
| Existing game-art REST providers | `src/providers.ts` | `ecosystem.json.legacyGameArtProviders` |
| Live REST provider operations | `src/external-engines.ts` | represented through adapter/runtime status |
| Phase 2 adapters | `src/provider-adapters-v2.ts` | `ecosystem.json.adapters` |
| Health/blockers | `src/provider-health-v2.ts` | `ecosystem.json.health` |
| Routing/fallback | `src/real-orchestration.ts`, `src/sdk-hub.ts` | `ecosystem.json.orchestration`, `ecosystem.json.sdk.routingPriority` |
| MCP endpoints | `src/integrations.ts` | `mcp.json` |
| Artifact contract | `src/artifacts.ts` | `schemas/artifact.schema.json` |
| Spend/security | `src/spend.ts`, `src/security.ts`, `src/integration-runtime.ts` | `ecosystem.json.spendPolicy` + agent instructions |
| Setup/smoke/health | `scripts/` | executable commands in `package.json` |
| Cross-LLM handoff | `AGENTS.md`, `llm-handoff/*`, portability docs | `dist/llm-handoff/` |

## Design rule

The TypeScript files are the canonical executable contracts. JSON files are portable snapshots for non-TypeScript agents and external automation. Regenerate snapshots after changing provider metadata, routing, adapters, blockers or spend policy.

## Secret rule

Only secret **names and auth schemes** belong in git. Secret values belong in the operator's local/deployment secret store and must not be included in `ecosystem.json`, `mcp.json`, documentation or handoff bundles.

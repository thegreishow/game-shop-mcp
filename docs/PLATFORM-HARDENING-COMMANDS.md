# Game Shop MCP — Next Command Backlog

```text
GAME_SHOP.P0.UNIFY_MCP_SURFACE
ACTION: Extract modular tool registrars for core, advanced, QA, learning, control-center, storage, diagnostics and trust; expose them through one canonical /mcp server.
DONE_WHEN: one connector discovers the full supported Game Shop tool inventory.

GAME_SHOP.P0.SCOPE_ALL_ENDPOINTS
ACTION: Apply OAuth tool-scope enforcement and RFC-style WWW-Authenticate challenges to every protected MCP endpoint.
DONE_WHEN: read-only OAuth tokens cannot reach write/deploy/execute tools on any route.

GAME_SHOP.P0.CONNECT_GITHUB_READ
ACTION: Configure least-privilege GAME_SHOP_GITHUB_TOKEN for registered private repositories; keep GAME_SHOP_ALLOW_GITHUB_WRITES=false until mutation is approved.
DONE_WHEN: gameshop_inspect_project reads private project roots from the deployed runtime.

GAME_SHOP.P0.DURABLE_OAUTH_CODES
ACTION: Replace process-memory authorization-code replay tracking with an atomic durable single-use code/nonce store; add revocation and consent audit events.
DONE_WHEN: an authorization code cannot be redeemed twice across separate serverless instances.

GAME_SHOP.P0.DURABLE_STATE_BOOTSTRAP
ACTION: Provision dedicated Game Shop persistence and convert scattered SQL constants into ordered, idempotent migrations for executions, artifacts, QA memory, capability trust, OAuth state and evidence.
DONE_WHEN: all state survives cold starts and schema state is versioned.

GAME_SHOP.P0.QA_EVIDENCE_INGEST
ACTION: Correlate GitHub Actions Playwright/Chrome runs to execution IDs; download/parse evidence artifacts and persist normalized findings into the Game Shop evidence graph.
DONE_WHEN: queued QA automatically transitions to terminal evidence without a human copying logs.

GAME_SHOP.P0.RELEASE_GOVERNOR_STRICT
ACTION: Require terminal green evidence from every mandatory QA lane before production eligibility; treat queued/missing evidence as provisional/blocked.
DONE_WHEN: production promotion cannot occur from stale or incomplete evidence.

GAME_SHOP.P1.NATIVE_MCP_2026_07_28
ACTION: Validate current SDK/handler compatibility, then migrate canonical /mcp transport and Tasks/App negotiation toward MCP 2026-07-28 while retaining client fallback.
DONE_WHEN: modern clients negotiate the new protocol and older 2025-11-25 clients remain functional.

GAME_SHOP.P1.TRUST_PIPELINE_V2
ACTION: Score MCP candidates using publisher provenance, repository metadata, auth model, tool annotations/input schemas, network behavior, sandbox results, runtime reliability and cost—not tool names alone.
DONE_WHEN: promotion scores are evidence-based and can automatically decay/downgrade after failures.

GAME_SHOP.P1.ARTIFACT_API_SYNC
ACTION: Synchronize advanced MCP artifact-purpose schemas with the universal artifact model and add provenance/license/expiry/checksum fields.
DONE_WHEN: every supported ProductKind can create/place/persist artifacts without schema mismatch.

GAME_SHOP.P1.PROVIDER_RECONCILER
ACTION: Add scheduled/webhook reconciliation for pending provider jobs with idempotency keys, bounded retries, exponential backoff and failure diagnostics.
DONE_WHEN: provider completion no longer depends on a user polling status tools.

GAME_SHOP.P1.PREVIEW_REGISTRY
ACTION: Normalize per-project deployment configuration, preview discovery and branch-to-preview correlation across Vercel and future hosts.
DONE_WHEN: every controlled branch can deterministically resolve its latest preview URL/state.

GAME_SHOP.P1.OBSERVABILITY_LEDGER
ACTION: Persist structured tool calls, external requests, latency, errors, retries, execution transitions and release decisions with secret redaction.
DONE_WHEN: Control Center can reconstruct why a build succeeded or failed.

GAME_SHOP.P1.COST_LEDGER
ACTION: Add provider-level estimated/actual credit and dollar accounting, mission budgets and hard spend ceilings independent of provider credentials.
DONE_WHEN: paid execution can be authorized with explicit per-mission budgets rather than a single global boolean.

GAME_SHOP.P1.DISTRIBUTED_RATE_LIMIT
ACTION: Replace process-local rate limiting with a durable/distributed limiter keyed by OAuth client/subject plus IP fallback.
DONE_WHEN: limits remain consistent across Vercel instances.

GAME_SHOP.P2.PROJECT_REGISTRY_V2
ACTION: Move project metadata into a durable registry with ProductKind, repo/root, deployment mapping, QA policy, artifact destinations and permission profile.
DONE_WHEN: new apps/sites/services can be registered without code changes or giant environment JSON.

GAME_SHOP.P2.CONTROL_CENTER_APP
ACTION: Turn the existing MCP Apps resource into the operational UI for executions, evidence, approvals, costs, artifacts, trust candidates and releases.
DONE_WHEN: a human can supervise the full factory without reading raw JSON.

GAME_SHOP.P2.CONTINUOUS_DISCOVERY
ACTION: Periodically search the official MCP Registry and verified API/CLI ecosystems for capability gaps, stage candidates, sandbox safely and propose promotions.
DONE_WHEN: Game Shop continuously expands its arsenal without blindly installing untrusted code.
```

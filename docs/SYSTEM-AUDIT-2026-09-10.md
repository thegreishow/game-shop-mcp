# Game Shop MCP — System Audit (2026-09-10)

This audit accompanies the platform-hardening-v2 pass. It separates fixes implemented in this branch from the next architecture work.

## Implemented in this pass

- Generalized project contexts from game-only `gamePath` to product-aware `projectPath` while keeping legacy compatibility.
- Expanded the build planner/router across backend, data, storage, auth, testing, deployment, commerce, observability and audio.
- Exposed all product kinds through the main MCP build schema.
- Added `gameshop_system_audit` so any connected AI can inspect runtime posture without seeing secret values.
- Added per-tool OAuth scope enforcement on the main MCP surface and WWW-Authenticate challenges.
- Hardened OAuth owner-secret comparison, access-token audience checking and warm-process authorization-code replay detection.
- Made capability-trust approval/promoted inventory reload from durable storage after cold starts.
- Standardized GitHub runtime credentials on `GAME_SHOP_GITHUB_TOKEN` with `GITHUB_TOKEN` compatibility.
- Activated Chrome DevTools diagnostics as a real QA lane and connected it to QA swarm failure escalation.
- Updated Playwright CI and browser fleet to use the same GitHub credential model.
- Modernized outbound MCP negotiation preference to 2026-07-28 → 2025-11-25 → 2025-03-26.
- Broadened artifact purposes to cover desktop apps, services, agents, automations, commerce and media projects.
- Aligned environment documentation with OAuth, durable state, browser workers and Vercel preview mappings.

## Highest-priority remaining work

1. Unify the fragmented MCP surfaces (`server`, `advanced`, `qa`, `learning`, `control-center`, `storage`, `diagnostics`) into one modular `/mcp` inventory so Grok/ChatGPT/Claude/Codex can see the whole factory through one connection.
2. Apply OAuth scope enforcement consistently to every protected MCP endpoint, not only the main and diagnostics routes.
3. Replace warm-process OAuth authorization-code replay memory with a durable, atomic single-use store; add revocation/audit support.
4. Configure the dedicated Game Shop durable database/object store and version its SQL as migrations rather than scattered schema constants.
5. Connect the Game Shop cloud runtime to private GitHub repositories with the least-privilege fine-grained token; keep writes disabled until a controlled mission needs them.
6. Ingest completed Playwright/Chrome workflow artifacts back into the execution/evidence graph instead of merely queueing them.
7. Make the release governor consume persisted evidence from every required QA lane and prevent production promotion until all required evidence is terminal and green.
8. Upgrade the public MCP transport to the 2026-07-28 model after compatibility validation; keep fallback compatibility for clients still negotiating 2025-11-25.
9. Improve capability trust beyond lexical tool-name scoring: publisher provenance, schemas/annotations, auth model, repository reputation, sandbox behavior, runtime reliability, cost and post-promotion health.
10. Add durable distributed rate limiting, structured audit logs, cost/credit accounting, idempotency keys and provider retry/backoff policies.

## Runtime blockers that configuration—not source code—must resolve

- Private GitHub source inspection needs `GAME_SHOP_GITHUB_TOKEN` (preferred) or `GITHUB_TOKEN` in the deployed runtime.
- Durable execution/artifact/QA/trust state needs the dedicated `GAME_SHOP_SUPABASE_URL` + service-role credential and schemas applied.
- Preview REST discovery needs `GAME_SHOP_VERCEL_PROJECTS_JSON` and `VERCEL_TOKEN` (or project deploy hooks).
- Remote external integrations remain intentionally disabled unless `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true`.
- Paid generation remains intentionally disabled unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`.

## Architectural direction

Game Shop should remain AI-independent. The durable execution/task/artifact/evidence graph belongs to Game Shop; Grok, ChatGPT, Codex, Claude, Cursor and future clients are interchangeable control surfaces.

# Game Shop standalone portability

Game Shop is designed so MCPs, SDKs, APIs, CLIs, local runtimes and provider metadata can be used without making the Game Shop orchestrator a hard dependency.

## Current portability model

- **Repository = source of truth for non-secret integration knowledge.** Provider IDs, capability metadata, package/version data, required environment-variable names, setup commands, routing, spend policy, local-runtime notes and known blockers belong in git.
- **Secrets stay out of git.** `.env.example` documents variable names only. Actual values live in local secret stores / deployment environments.
- **Direct path:** any compatible agent or LLM can consume a provider MCP/API/SDK directly.
- **Game Shop path:** an agent can call Game Shop and let it route, normalize outputs, register artifacts and apply spend/write controls.
- **Portable handoff:** `npm run handoff:llm` builds a non-secret bundle under `dist/llm-handoff/` that can be given to Grok, Grokbot, Claude, Gemini, Codex or another coding agent.
- **Machine-readable snapshots:** `ecosystem.json`, `mcp.json`, `schemas/artifact.schema.json` and `llm-handoff/agent-config.json` let another agent orient itself without conversational memory.

## Standalone phase status

1. MCP discovery / registration: substantially complete. Vendor-blocked or local-runtime-only integrations are tracked explicitly rather than blocking the platform.
2. API/credential layer: substantially complete. Some providers remain intentionally deferred or provider-auth blocked.
3. SDK Hub Phase 2: active. Replicate, fal, ElevenLabs, Scenario and Cloudinary have versioned SDK metadata, lazy loading, unified adapters, health scoring and capability routing.
4. Real orchestration: active. `gameshop_plan_provider_task` and `gameshop_run_provider_task` route through provider health + adapters, while async jobs can be continued and ready artifacts flow into persistence/place/verify/QA.
5. Portability / LLM handoff: active. `AGENTS.md`, `ecosystem.json`, `mcp.json`, the handoff manifest and one-command bootstrap make the repository self-describing to another agent.
6. Remaining work: deepen provider-specific SDK-native adapters, live-auth verification, broader artifact normalization and routing quality signals without weakening the existing safety gates.

## What must live in git

Keep these categories versioned:

- full provider catalog and capability data
- MCP endpoints and install/setup commands
- SDK package names, versions and adapter contracts
- API base URLs and auth *types* (never secret values)
- required env-var names
- capability routing, priorities and fallback policy
- provider readiness, known blockers and local-runtime states
- spend/write/security gates
- setup, health and smoke scripts
- artifact schemas and normalization contracts
- real orchestration logic
- generated machine-readable snapshots
- handoff manifest and agent instructions

The canonical files are listed in `AGENTS.md` and `llm-handoff/manifest.json`.

## New-machine / new-agent bootstrap

```bash
git clone <repo>
cd game-shop-mcp
npm run bootstrap:universal
```

The bootstrap installs repository-pinned dependencies, creates a secret-free `.env.local` template when necessary, runs non-billable validation, regenerates machine-readable snapshots and builds `dist/llm-handoff/`.

Then configure provider secrets locally using the names in `.env.example`. Do not paste secrets into repo files.

## Giving the system to another LLM

Best option: give the LLM repository access and tell it to read, in order:

1. `AGENTS.md`
2. `ecosystem.json`
3. `mcp.json`
4. `docs/STANDALONE_PORTABILITY.md`
5. `docs/REAL_ORCHESTRATION.md`
6. `llm-handoff/manifest.json`
7. `llm-handoff/agent-config.json`

If direct repo access is inconvenient, run:

```bash
npm run handoff:llm
```

and upload `dist/llm-handoff/` to the other LLM. The exporter refuses common credential patterns and excludes secret-bearing env files.

## Grok / Grokbot

Grok does not need a special Game Shop-only representation. Give it either the git repository or the generated handoff directory.

If Grok/Grokbot supports remote MCP, point it at the Game Shop MCP endpoint from `mcp.json` and provide `GAME_SHOP_MCP_TOKEN` through its own secret/configuration system. Direct provider MCP definitions are also retained in `mcp.json` and the full integration catalog.

Recommended instruction to another LLM:

> Treat this repository as the canonical Game Shop source. Read AGENTS.md, ecosystem.json and mcp.json first. Preserve standalone direct-provider access. Never commit or echo secret values. Keep paid generation and live external execution behind their existing explicit opt-in gates. Use Game Shop provider health and planning before execution, do not auto-resubmit ambiguous paid generations to another vendor, and keep successful outputs in the universal artifact lifecycle.

# Game Shop standalone portability

Game Shop is designed so MCPs, SDKs, APIs, CLIs, local runtimes and provider metadata can be used without making the Game Shop orchestrator a hard dependency.

## Current portability model

- **Repository = source of truth for non-secret integration knowledge.** Provider IDs, capability metadata, package names, required environment-variable names, setup commands, routing, spend policy, local-runtime notes and known blockers belong in git.
- **Secrets stay out of git.** `.env.example` documents variable names only. Actual values live in local secret stores / deployment environments.
- **Direct path:** any compatible agent or LLM can consume a provider MCP/API/SDK directly.
- **Game Shop path:** an agent can call Game Shop and let it route, normalize artifacts and apply spend/write controls.
- **Portable handoff:** `npm run handoff:llm` builds a non-secret bundle under `dist/llm-handoff/` that can be given to Grok, Grokbot, Claude, Gemini, Codex or another coding agent.

## Standalone phase status

1. MCP discovery / registration: substantially complete. Vendor-blocked or local-runtime-only integrations are tracked rather than blocking the platform.
2. API/credential layer: substantially complete. Some providers remain intentionally deferred or provider-auth blocked.
3. SDK Hub Phase 1: active. Replicate, fal, ElevenLabs, Scenario and Cloudinary are represented in `src/sdk-hub.ts` with lazy loading and capability routing.
4. Portability / LLM handoff: active. This document, `llm-handoff/manifest.json`, `AGENTS.md`, and `scripts/export-llm-handoff.sh` make the repository self-describing to another agent.
5. Next: move live provider operations behind SDK adapters, normalize artifacts, add provider health/fallback scoring, then expose routing through the orchestrator.

## What must live in git

Keep these categories versioned:

- provider catalog and capability data
- MCP endpoints and install commands
- SDK package names and adapter contracts
- API base URLs and auth *types* (never secret values)
- required env-var names
- capability routing and provider priority
- spend/write/security gates
- setup and validation scripts
- known provider blockers/deferred states
- artifact normalization contracts
- handoff manifest and agent instructions

The repository currently carries these across `src/integrations.ts`, `src/sdk-hub.ts`, `src/external-engines.ts`, `src/spend.ts`, `.env.example`, `docs/`, and `scripts/`.

## New-machine / new-agent bootstrap

```bash
git clone <repo>
cd game-shop-mcp
npm install
npm run setup:sdk-hub
npm run handoff:llm
```

Then configure provider secrets locally using the names in `.env.example`. Do not paste secrets into repo files.

## Giving the system to another LLM

Best option: give the LLM repository access and tell it to read, in order:

1. `AGENTS.md`
2. `llm-handoff/manifest.json`
3. `docs/STANDALONE_PORTABILITY.md`
4. `docs/SDK_HUB.md`
5. `src/integrations.ts`
6. `src/sdk-hub.ts`
7. `src/spend.ts`
8. `.env.example`

If direct repo access is inconvenient, run:

```bash
npm run handoff:llm
```

and upload `dist/llm-handoff/` to the other LLM. The export contains no provider secret values.

## Grok / Grokbot

Grok does not need a special Game Shop-only representation. Give it either the git repository or the generated handoff directory. The machine-readable manifest declares providers, SDKs, MCPs, security rules and canonical files so an agent can orient itself without relying on ChatGPT conversation memory.

Recommended instruction to another LLM:

> Treat this repository as the canonical Game Shop source. Read AGENTS.md and llm-handoff/manifest.json first. Preserve the standalone architecture: direct provider access must remain possible, secrets must not be committed, and paid-generation calls must obey the existing spend lock. Update provider metadata, SDK/API/MCP contracts, setup scripts and handoff manifest whenever an integration changes.

# Game Shop agent instructions

Read this file first when taking over the repository from another LLM or coding agent.

## Mission

Game Shop is an orchestration layer over MCPs, APIs, SDKs, CLIs, libraries and local runtimes. It must never become a mandatory dependency for direct provider access.

## Core rules

- Keep provider integrations independently usable where the upstream provider supports it.
- Never commit secret values. `.env.example` contains names only.
- Keep `GAME_SHOP_ALLOW_PAID_GENERATION` disabled by default.
- Any provider request that can create billable generation must call `assertPaidGenerationAllowed()` immediately before the request.
- Do not mislabel SDKs/APIs/libraries/CLIs as MCPs.
- Preserve artifact capture, routing, provider health and fallback behavior when migrating adapters.
- Prefer lazy SDK imports so optional providers do not become hard runtime dependencies.
- Update machine-readable handoff data whenever provider contracts or status change.

## Canonical files

- `llm-handoff/manifest.json` — machine-readable map for another LLM.
- `docs/STANDALONE_PORTABILITY.md` — architecture and handoff process.
- `docs/SDK_HUB.md` — SDK Hub design/status.
- `src/integrations.ts` — verified integration catalog.
- `src/sdk-hub.ts` — SDK provider registry, lazy loaders and capability routing.
- `src/external-engines.ts` — legacy/current direct REST provider execution adapters while SDK migration proceeds.
- `src/spend.ts` — paid-generation lock.
- `.env.example` — non-secret configuration contract.

## Handoff

Run `npm run handoff:llm` to generate `dist/llm-handoff/`. This is the preferred portable context package for Grok/Grokbot/Claude/Gemini/Codex when repository access is unavailable.

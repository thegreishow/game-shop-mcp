# Game Shop MCP

Game Shop MCP is the control plane for The Game Shop: a safe, resumable AI-native production system for browser games and other digital products. One remote MCP endpoint can be used by Grok, ChatGPT, Codex, Claude, Cursor, and other compatible clients while credentials, project boundaries, spend controls, QA evidence, and execution state remain server-side.

## What it does

The canonical `/mcp` surface provides project discovery and planning, GitHub-scoped execution, artifact lifecycle/orchestration, provider routing, external integrations, browser QA, Playwright/Chrome diagnostics, previews, repair planning, release governance, execution/task handles, trust/discovery, observability, budgets, and multi-AI continuity.

For arcade titles, `thegreishow/thegreishow.com:arcade/games/games.json` is the primary title registry. Game metadata in that file supplies the MCP project root, framework, art direction, verification scope, aliases, and QA contract. `src/projects.ts` retains only compatibility fallbacks so an unavailable private-registry read does not break existing production clients.

## Controlled build loop

```text
inspect registered project
  -> understand goal
  -> build plan
  -> select allowed capabilities/providers
  -> prepare execution handle
  -> create gameshop/* branch
  -> mutate only the registered project root
  -> create/reuse preview
  -> run structural + browser playtests
  -> repair approved failures
  -> verify branch scope
  -> create PR
```

Game Shop does not intentionally write directly to `main`. Automatic deployment requires an explicit deploy gate. Billable generation requires an explicit paid-generation gate.

## Permission model

External network access and permission to perform an operation are separate concepts. `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true` only allows the runtime to reach a configured external provider. It does **not** authorize mutations.

Operation classes are:

- `read` — enabled by default.
- `generate` — requires `GAME_SHOP_ALLOW_GENERATION=true`.
- `write` — requires `GAME_SHOP_ALLOW_EXTERNAL_WRITES=true`.
- `destructive` — requires `GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS=true`.
- `deploy` — requires `GAME_SHOP_ALLOW_DEPLOY=true`.

GitHub mutation also independently requires `GAME_SHOP_ALLOW_GITHUB_WRITES=true`. Paid or potentially paid generation independently requires `GAME_SHOP_ALLOW_PAID_GENERATION=true`. Dangerous gates should remain unset in normal production until a human explicitly authorizes the action.

## External integrations

External MCP/REST execution is default-deny. Each executable operation must match an explicit integration policy declaring:

```text
billing: free | potentially-paid | paid
mutation: read | write | destructive
operationClass: read | generate | write | destructive | deploy
```

Unknown MCP tools, methods, and REST paths are blocked even when the integration network gate is enabled. Keyword-based billable detection is retained only as a secondary safety brake.

## OAuth and owner gateway

Game Shop supports the owner gateway bearer token as well as OAuth 2.1 authorization-code + PKCE for web/cloud MCP clients. OAuth clients should receive least privilege. Current scopes include:

```text
gameshop.read
gameshop.plan
gameshop.generate
gameshop.github.read
gameshop.github.write
gameshop.integrations.read
gameshop.integrations.invoke
gameshop.qa
gameshop.execute
gameshop.write
gameshop.deploy
```

Legacy broader scopes remain accepted as compatibility aliases while existing clients migrate. OAuth authorization codes can use the durable store for single-use redemption.

## GitHub execution safety

Registered projects define a repository root and verification paths. Game Shop rejects path traversal and project-directory escape, requires `gameshop/*` branches for controlled mutations, verifies branch scope before PR creation, and blocks GitHub writes unless explicitly enabled. The preferred credential is `GAME_SHOP_GITHUB_TOKEN`; `GITHUB_TOKEN` remains a compatibility fallback.

## Execution handles and persistence

Executions, tasks, artifacts, QA evidence, trust state, OAuth state, budgets, events, previews, and project registrations support durable Supabase/Postgres storage when `GAME_SHOP_SUPABASE_URL` and `GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY` are configured and migrations are applied. Process-memory fallbacks are for compatibility/development and should not be treated as production durability.

## QA and release governance

Game Shop supports structural verification plus browser lanes using Browserbase, Playwright MCP/CI, and Chrome DevTools diagnostics. Worker results can be persisted into the QA evidence ledger. The Release Governor distinguishes missing evidence (`BLOCKED`), queued evidence (`PROVISIONAL`), failed evidence (`RED`), and complete required evidence (`GREEN`).

The website repository separately runs registry-driven arcade playtests against every title in `arcade/games/games.json` so blank screens, fatal console errors, missing critical assets, broken controls, and short-session crashes can fail CI.

## Asset lifecycle

Generated media follows:

```text
generated -> staged -> reviewed -> optimized -> production
```

Intermediate AI output belongs in durable object/media storage rather than Git. Git is reserved for source and approved production assets. The asset policy enforces review/production rules and a configurable Git size ceiling; the arcade CI also rejects newly committed game assets above its production threshold.

## Spend lock

Paid generation is **off by default**. Provider-specific adapters and generic integration execution must pass the appropriate operation gate and `assertPaidGenerationAllowed()` before creating potentially billable work. Never infer permission to spend from the fact that credentials are configured.

## Rate limiting

The canonical MCP uses tool-class rate limits (`read`, `qa`, `execute`, `write`, `deploy`, `generation`). With the durable database migration applied, counters are shared across serverless instances. If the distributed backend is unavailable, Game Shop falls back to in-process limits. Identity preference is authenticated OAuth `client_id + subject`, then owner gateway identity, then IP.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm test
npx vercel dev
```

Local MCP endpoint:

```text
http://localhost:3000/mcp
```

Never commit `.env.local`, API keys, access tokens, OAuth owner secrets, or service-role keys.

## Important runtime configuration

See `.env.example` for the complete list. Core settings include:

```text
GAME_SHOP_MCP_TOKEN
GAME_SHOP_GITHUB_TOKEN
GAME_SHOP_OAUTH_SIGNING_SECRET
GAME_SHOP_OAUTH_OWNER_SECRET
GAME_SHOP_SUPABASE_URL
GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY
GAME_SHOP_WORKER_SECRET
GAME_SHOP_VERCEL_PROJECTS_JSON
VERCEL_TOKEN
```

Keep these unset unless deliberately required:

```text
GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS
GAME_SHOP_ALLOW_GENERATION
GAME_SHOP_ALLOW_EXTERNAL_WRITES
GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS
GAME_SHOP_ALLOW_DEPLOY
GAME_SHOP_ALLOW_GITHUB_WRITES
GAME_SHOP_ALLOW_PAID_GENERATION
```

## Tests

`npm test` runs TypeScript checking, canonical MCP smoke tests, OAuth/PKCE tests, and security-hardening tests. The security suite covers project escape, branch/write locks, least-privilege scope mapping, default-deny integration operations, paid-operation classification, asset promotion rules, secret redaction, oversized binary placement, external-call lock behavior, and rate-limit isolation.

## Design principles

1. Game Shop owns authoritative execution state; individual AI clients do not.
2. Registered project scope is a hard boundary, not a suggestion.
3. Read, generation, write, destructive, deploy, and spend permissions are separate.
4. External capabilities are allowlisted and trust-scored before promotion.
5. Tests are added before compatibility code is removed.
6. Existing production game concepts and visuals are preserved during incremental refactors.
7. Preview and QA evidence must correspond to the exact commit being considered for release.

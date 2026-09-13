# Game Shop MCP v0.4

Game Shop MCP is the supervisory and execution layer for The Game Shop. It exposes a shared remote MCP surface to ChatGPT, Codex, Grok, Cursor, Claude and other compatible clients while keeping project credentials and provider keys server-side.

The system coordinates project context, build planning, controlled GitHub execution, QA evidence, artifacts, budgets, integrations, governance, trust, previews, provider reconciliation and cross-AI handoffs.

## Operating model

```text
AI client
   |
   v
OAuth / gateway authentication
   |
   v
Game Shop MCP
   |-- canonical arcade inventory + Project Registry V2 enrichment
   |-- Planning / routing / execution preparation
   |-- Controlled GitHub project edits
   |-- QA / diagnostics / release governance
   |-- Artifact + preview lifecycle
   |-- Integration health / discovery / trust
   |-- Budget + spend controls
   |-- Durable governance + cross-AI handoffs
   |
   +--> explicitly allowlisted external provider operations
```

The intended production loop is:

```text
inspect project
-> understand goal
-> create build plan
-> select capabilities/providers
-> prepare execution
-> create gameshop/* branch
-> edit only the registered project root
-> run validation/playtests
-> repair failures
-> verify branch scope
-> preview/release review
-> PR
```

## Security posture

Production authentication fails closed when gateway/OAuth authentication is not configured.

OAuth access is separated by capability class:

- `gameshop.read`
- `gameshop.plan`
- `gameshop.qa`
- `gameshop.execute`
- `gameshop.write`
- `gameshop.deploy`

Tool calls are classified and checked against the caller's scopes. Gateway-token access remains an owner/operator path.

Independent opt-ins:

```text
GAME_SHOP_ALLOW_GITHUB_WRITES=true
GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true
GAME_SHOP_ALLOW_PAID_GENERATION=true
```

Enabling one does not grant either of the others.

## External integration policy

The generic integration runtime is deny-by-default. External operations must be present in the declarative operation registry before Game Shop can invoke them.

Each allowed operation declares:

```text
integration
operation
mode / HTTP method / path or MCP tool
billing: free | potentially-paid | paid
mutation: read | write | destructive
```

Unknown operations are rejected. Generic destructive operations such as DELETE are not enabled by default. Any operation classified as non-free must still pass the paid-generation lock immediately before invocation.

Provider-specific adapters may implement richer workflows, but they must retain explicit permission and spend controls.

## One game inventory authority

`thegreishow/thegreishow.com:arcade/games/games.json` is the canonical source for which Game Shop games exist and where their project roots live.

At MCP startup/request hydration, Game Shop reads that manifest through its GitHub credential and overlays the canonical IDs, names and project roots into the project system. This prevents the site catalog and MCP project inventory from silently diverging.

Project Registry V2 remains the operational-enrichment layer for data that does not belong in the public game catalog, including deployment configuration, artifact destinations, QA policies, regressions, permission profiles, budgets and brand context. Legacy hardcoded projects remain compatibility fallback only and should be removed after production registry hydration is proven reliable.

## Controlled GitHub execution

Game Shop project execution is intentionally scoped:

- projects must be registered/allowlisted
- writes require the GitHub-write lock
- autonomous branches use `gameshop/*`
- edits are restricted to the registered project root
- verification checks for changes outside that root
- PR creation should follow branch verification

Use `GAME_SHOP_GITHUB_TOKEN` as the preferred project credential. `GITHUB_TOKEN` is retained for compatibility.

## Governance, trust and continuity

v0.4 includes durable/supervisory systems for governance events, execution history, budgets, provider reservations/settlements, integration health, capability discovery, trust incidents/rescoring, preview status, provider reconciliation, cross-AI handoffs and control-center supervision.

Scheduled workers can reconcile provider jobs and perform integration-health/discovery sweeps when `GAME_SHOP_WORKER_SECRET` is configured.

## Rate limiting

Requests are separated into `read`, `qa`, `execute`, `write`, `deploy` and `generation` classes. With Supabase configured, Game Shop uses the atomic distributed rate-limit RPC from migration `007_rate_limit.sql`; otherwise it falls back to an in-memory limiter for local/single-instance use.

## Durable state

```text
GAME_SHOP_SUPABASE_URL
GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY
GAME_SHOP_ARTIFACT_BUCKET=game-shop-artifacts
```

The service-role key is server-only and must never be exposed to browser code, MCP responses, logs, commits or screenshots.

## MCP / provider integrations

The catalog includes remote MCPs, REST APIs, local/desktop MCPs, project libraries and installable registries across game development, UI, motion, 3D, audio, video, art, deployment and infrastructure.

A catalog entry does not automatically grant execution permission. Runtime readiness depends on integration type, credentials, external-execution policy and an explicit operation allowlist.

Remote MCP initialization negotiates supported protocol versions with a v0.4 client identity.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
npx vercel dev
```

Default MCP endpoint:

```text
http://localhost:3000/mcp
```

Checks:

```bash
npm run typecheck
npm run test:mcp
npm run test:oauth
npm run test:security
npm test
```

## Core environment controls

```text
GAME_SHOP_MCP_TOKEN
GAME_SHOP_OAUTH_SIGNING_SECRET
GAME_SHOP_OAUTH_OWNER_SECRET
GAME_SHOP_OAUTH_CLIENT_ID
GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS
GAME_SHOP_ALLOW_PAID_GENERATION
GAME_SHOP_ALLOW_GITHUB_WRITES
GAME_SHOP_GITHUB_TOKEN
GAME_SHOP_PROJECTS_JSON
GAME_SHOP_SUPABASE_URL
GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY
GAME_SHOP_ARTIFACT_BUCKET
GAME_SHOP_WORKER_SECRET
```

Provider and deployment credentials are documented in `.env.example`. Configure only integrations actually being used.

## CI

Canonical CI verifies TypeScript type safety, MCP smoke behavior, OAuth/PKCE behavior and adversarial security checks. The smoke suite covers governance, budgets, rate limits, registry behavior, integration health, trust, continuity and default spend blocking. The adversarial suite checks deny-by-default integration policy and privilege/scope boundaries.

## Production rules

- Paid generation stays OFF unless explicitly approved.
- GitHub writes stay OFF unless explicitly approved.
- External execution stays OFF unless explicitly approved.
- Unknown external operations are denied.
- Destructive operations require explicit design and authorization.
- Keep autonomous edits inside the registered project root.
- Never expose credentials in logs, tool responses, issues, commits or test output.
- Prefer incremental game/runtime refactors over rewrites.
- A capability is not production-ready until its safety boundary and regression path are tested.

# Game Shop MCP v0.4

Game Shop MCP is the supervisory and execution layer for The Game Shop. It exposes a shared remote MCP surface to ChatGPT, Codex, Grok, Cursor, Claude and other compatible clients while keeping project credentials and provider keys server-side.

The system is no longer only a provider gateway. It coordinates project context, build planning, controlled GitHub execution, QA evidence, artifacts, budgets, integrations, governance, trust, previews, provider reconciliation and cross-AI handoffs.

## Operating model

```text
AI client
   |
   v
OAuth / gateway authentication
   |
   v
Game Shop MCP
   |-- Project Registry V2 + project overlays
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

GitHub writes are separately locked behind:

```text
GAME_SHOP_ALLOW_GITHUB_WRITES=true
```

External integrations are separately locked behind:

```text
GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true
```

Paid generation is separately locked behind:

```text
GAME_SHOP_ALLOW_PAID_GENERATION=true
```

These switches are intentionally independent. Enabling one does not imply permission for the others.

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

## Project Registry V2

Project Registry V2 is the operational project authority for Game Shop MCP. A registered project can include:

- project ID and name
- product kind
- GitHub repository and project root
- default branch and framework
- deployment provider/project
- artifact destinations
- QA policy and required regressions
- permission profile
- budget profile
- brand context

When Supabase durable state is configured, project records are persisted there and hydrated into live project overlays before MCP work. Legacy project definitions remain only as a compatibility fallback during migration.

New projects can be registered without adding hardcoded entries to `src/projects.ts`.

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

v0.4 includes durable/supervisory systems for:

- governance events and execution history
- execution budgets and provider reservations/settlements
- integration health
- capability discovery
- capability trust incidents and rescoring
- preview registry/test status
- provider job reconciliation
- cross-AI handoff snapshots
- control-center supervision

Scheduled workers can reconcile provider jobs and perform integration-health/discovery sweeps when `GAME_SHOP_WORKER_SECRET` is configured.

## Rate limiting

Requests are separated into rate classes:

- read
- QA
- execute
- write
- deploy
- generation

With Supabase configured, Game Shop uses the atomic distributed rate-limit RPC from migration `007_rate_limit.sql`. Otherwise it falls back to an in-memory limiter suitable for local development/single-instance use.

## Durable state

Configure:

```text
GAME_SHOP_SUPABASE_URL
GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY
GAME_SHOP_ARTIFACT_BUCKET=game-shop-artifacts
```

The service-role key is server-only and must never be exposed to browser code, MCP responses, logs, commits or screenshots.

## MCP / provider integrations

The catalog includes remote MCPs, REST APIs, local/desktop MCPs, project libraries and installable registries across game development, UI, motion, 3D, audio, video, art, deployment and infrastructure.

A catalog entry does not automatically grant execution permission. Runtime readiness depends on integration type, credentials, external-execution policy and an explicit operation allowlist.

Remote MCP initialization currently negotiates supported protocol versions with a v0.4 client identity.

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

Useful checks:

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

Provider and deployment credentials are documented in `.env.example`. Configure only the integrations actually being used.

## CI

The canonical CI verifies:

1. TypeScript type safety
2. MCP smoke behavior
3. OAuth/PKCE behavior
4. adversarial security checks

The smoke suite verifies the canonical future-stack tool inventory plus governance, budgets, rate limits, registry behavior, integration health, trust, continuity and default spend blocking.

The adversarial suite specifically checks deny-by-default integration policy and privilege/scope boundaries. Expand it whenever a new mutation or external execution path is introduced.

## Production rules

- Paid generation stays OFF unless explicitly approved.
- GitHub writes stay OFF unless explicitly approved.
- External execution stays OFF unless explicitly approved.
- Unknown external operations are denied.
- Destructive operations require explicit design and authorization; they are not inherited from generic HTTP access.
- Keep autonomous edits inside the registered project root.
- Never expose credentials in logs, tool responses, issues, commits or test output.
- Prefer incremental game/runtime refactors over rewrites.
- A capability is not considered production-ready until its safety boundary and regression path are tested.

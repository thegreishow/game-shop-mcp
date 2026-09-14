# Game Shop Web Console

Game Shop exposes a first-party browser control surface at `/console` on the deployed Game Shop host.

## Purpose

The console is a real remote MCP client, not a separate copy of Game Shop logic. It authenticates with the same OAuth server, initializes Streamable HTTP MCP sessions, discovers the live tool inventory and invokes the same MCP tools used by other clients.

The primary operating model is now project-aware Mission Control:

`select project → load context → plan mission → specialist handoff → Running → QA ↔ Repair → Ready → Released`

## Authentication

The console uses OAuth authorization-code flow with PKCE S256 and dynamic client registration.

Default requested scopes:

- `gameshop.read`
- `gameshop.plan`
- `gameshop.qa`
- `offline_access`

Elevated scopes are opt-in in the UI:

- `gameshop.execute`
- `gameshop.write`
- `gameshop.deploy`

The owner approval secret is entered only on the Game Shop authorization page. The browser console never receives or stores it. Access and refresh tokens are kept in `sessionStorage`; the dynamically registered public client ID may be kept in `localStorage` because it is not a credential.

First-party OAuth redirects are allowlisted only for the canonical Vercel host and the intended `gameshop.thegreishow.com` host. Localhost loopback remains supported for development. No Vercel preview wildcard is authorized.

## MCP flow

1. OAuth discovery.
2. Dynamic client registration.
3. Owner authorization.
4. Token exchange.
5. MCP initialize.
6. `notifications/initialized`.
7. live tool discovery.
8. project-aware reads/planning/QA or separately authorized elevated actions.

Server-side tool-scope authorization remains authoritative. The console cannot bypass missing OAuth scopes, paid-generation gates, project-write gates, external-execution gates or deployment policy.

## Console surfaces

### Overview

System posture, existing platform metrics, quick routing and activity.

### Mission Control

Selects a real project from the cross-product registry and loads:

- source provider/repository/project id;
- project root and branch where applicable;
- runtime/framework detection;
- deployment and preview history;
- recent QA evidence;
- learned regression recipes;
- known issues;
- recent durable mission jobs;
- available specialist lanes.

Planning creates a durable mission packet. It does not silently execute the specialists.

### Projects

Existing searchable project inventory remains available. Mission Control adds the cross-product registry for actual project selection.

### Execution Dashboard

Displays durable jobs grouped as:

`Planned → Running → QA → Repair → Ready → Released`

Each job can show budget/actual spend, current specialist/provider, handoff history, artifacts captured on the execution, QA evidence, preview state, errors and rollback strategy.

### Visual QA

Displays before/after screenshot URLs and persisted QA provider state. Reviewers can record:

- findings;
- console errors;
- network errors;
- Playwright JSON/result metadata;
- reviewer notes.

Repair returns the mission to repair. Approve Ready requires terminal green mission evidence. Release requires Deploy scope and a green strict Release Governor.

### Tool Deck

Searchable live MCP inventory with schema-driven JSON arguments. It remains useful for lower-level inspection or operations outside the guided Mission Control flow.

### Connections

Browser OAuth permissions and remote MCP connection details.

## Specialist handoffs

Mission Control distinguishes server-capable and client/local specialists. A handoff to Game Studio, Unity, Game Development Studio, Build 3D Game Rooms, Yoroll, Lovable or Expo can be client-mediated depending on the runtime. The console shows the structured task packet and required permission instead of pretending a remote Vercel server invoked a local/plugin-only tool.

## Friendly domain

`gameshop.thegreishow.com` is OAuth-allowlisted and the console is domain-ready. Actual DNS and Vercel project-domain attachment are infrastructure operations outside the source bundle; until attached, `https://game-shop-mcp.vercel.app/console` remains canonical.

## External clients

OAuth MCP URL:

`https://game-shop-mcp.vercel.app/mcp`

Static Bearer MCP URL for CLI/CI clients:

`https://game-shop-mcp.vercel.app/api/mcp`

Recommended initial OAuth grant:

`gameshop.read gameshop.plan gameshop.qa offline_access`

Add execute/write/deploy only for sessions that actually need those powers.

## Verification

Run:

```bash
npm run test:mission-control
npm run test:web-console
```

These checks cover Mission Control lifecycle, App/Media routing, visual QA fields, JavaScript syntax, the static console contract, MCP client methods, PKCE behavior, Vercel routing, responsive Mission Control UI and first-party redirect boundaries.

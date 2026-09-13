# Web / Game Backend Capability Expansion

This pass classifies broad web, game, database, auth, realtime and backend tooling without turning the Game Shop orchestrator into a monolith.

## Core orchestrator dependencies

Only install a package into Game Shop itself when Game Shop must call that provider or runtime directly. Current priorities are provider SDKs and orchestration/runtime infrastructure. Frontend frameworks, rendering engines, game engines and target-app helpers should stay out of the orchestrator unless a concrete adapter requires them.

## Provider / platform integrations

| Integration | Role | Game Shop treatment |
| --- | --- | --- |
| Supabase | Postgres, Auth, Storage, Realtime | Existing durable-state platform; SDK may be added to a dedicated adapter when direct client usage is required. |
| Stripe | Payments / billing | Server-side `stripe` SDK belongs in a payment adapter; browser `@stripe/stripe-js` belongs in generated web apps. |
| Firebase | App backend platform | Register as an optional provider/project capability. Use the modular Firebase JS SDK in target apps; admin/server access should use a server-only adapter when needed. |
| Clerk | Auth / user management | Use current `@clerk/backend` for general Node backend access or framework-specific packages such as `@clerk/express`; do not use deprecated `@clerk/clerk-sdk-node`. |
| LootLocker | Game backend | Treat as API-first for web/Node Game Shop workflows. Official engine SDKs exist for Unity, Unreal and Godot; generic web integrations should use REST unless a current official JS SDK is verified. |
| IGDB | Game metadata | Treat as API/provider integration after auth contract is verified; keep client packages out of core until an adapter needs them. |

## Generated-project dependencies

These are valuable project ingredients but should normally be installed only into generated projects that need them:

- `@tanstack/react-query` for React data synchronization.
- `@stripe/stripe-js` for browser Stripe.js.
- `socket.io` and `socket.io-client` for custom realtime servers/clients.
- `three` for 3D web experiences.
- `phaser` for 2D browser games.
- `express` for generated Node servers.
- `mongoose` only for MongoDB-backed projects.
- `axios` only when a project/provider specifically benefits from it; native `fetch` remains the default.
- `firebase` for Firebase target apps.
- `@clerk/backend` / `@clerk/express` only when Clerk is selected.

## Python backend templates

`fastapi` and `uvicorn` are template/runtime dependencies for generated Python backends. They are not dependencies of the Node Game Shop MCP service.

## Recommended project recipes

### 2D web game

Phaser + Supabase or LootLocker, adding Socket.IO only when custom authoritative realtime is required.

### 3D web game

Three.js + Supabase, with Socket.IO only for custom realtime simulation.

### SaaS / commerce app

React Query + Supabase + Stripe; Clerk is optional when external auth/user management is preferred over Supabase Auth.

### Node API

Express + Supabase + Stripe, with Socket.IO for realtime workloads.

### Python API

FastAPI + Uvicorn with provider-specific Python clients selected by the generated project.

## Supply-chain rules

- Keep `package-lock.json` committed.
- CI uses `npm ci`; CI must never silently regenerate the lockfile.
- Review lockfile diffs with code changes.
- Do not use `npm audit fix --force` as a blanket remediation.
- Prefer official current packages and reject deprecated SDKs.
- Keep provider secrets server-side and out of generated browser bundles.

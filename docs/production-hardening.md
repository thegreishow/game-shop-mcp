# Production hardening

## Authentication

Production fails closed. Set `GAME_SHOP_MCP_TOKEN` in the deployment environment and send it as `Authorization: Bearer <token>`. When `NODE_ENV=production` or `VERCEL_ENV=production`, a missing token returns HTTP 503 instead of exposing the MCP gateway.

## Spend and write locks

Paid provider generation remains disabled unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`.

GitHub writes are controlled separately and remain disabled unless `GAME_SHOP_ALLOW_GITHUB_WRITES=true`. Enabling paid generation does not enable repository writes, and enabling repository writes does not enable paid generation.

## Rate limits and provider timeouts

`GAME_SHOP_RATE_LIMIT_PER_MINUTE` defaults to 60 requests per client/IP per warm server instance.

`GAME_SHOP_PROVIDER_TIMEOUT_MS` defaults to 12000 ms for external provider calls.

The built-in rate limiter is a first-line abuse guard for the current Vercel deployment model. A shared distributed limiter should replace it if the gateway scales across many concurrent instances or is exposed to untrusted public traffic.

## Project context

Projects are allowlisted through `GAME_SHOP_PROJECTS_JSON` instead of accepting arbitrary repositories. Example:

```json
[
  {
    "id": "wata-dash",
    "repo": "thegreishow/thegreishow.com",
    "defaultBranch": "main",
    "framework": "phaser",
    "gamePath": "arcade/games/wata-dash",
    "artStyle": "Jamaica-inspired arcade delivery game"
  }
]
```

Available project tools:

- `gameshop_list_projects`
- `gameshop_project_context`
- `gameshop_github_read_file`
- `gameshop_github_upsert_file`

GitHub execution requires a server-side `GITHUB_TOKEN`. Repository names come only from the project allowlist.

## CI

`npm test` runs TypeScript typechecking and the MCP smoke suite. The smoke suite exercises the actual MCP handler and checks:

- production auth fails closed when no token exists;
- authenticated MCP initialization succeeds;
- tool discovery succeeds;
- project/GitHub tools are registered;
- paid generation is disabled by default;
- a paid generation tool is rejected while the spend lock is off.

The GitHub Actions workflow runs these checks on pull requests and on pushes to `main`.

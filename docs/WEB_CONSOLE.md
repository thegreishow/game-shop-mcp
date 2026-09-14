# Game Shop Web Console

Game Shop exposes a first-party browser control surface at `/console` on the deployed Game Shop host.

## Purpose

The console is a real remote MCP client, not a separate copy of Game Shop logic. It authenticates with the same OAuth server, initializes a Streamable HTTP MCP session, discovers the live tool inventory and invokes the same MCP tools used by ChatGPT, Grok, Codex and other clients.

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

First-party OAuth redirects are allowlisted only for:

- `https://game-shop-mcp.vercel.app`
- `https://gameshop.thegreishow.com`

Localhost loopback remains supported for development. No Vercel preview wildcard is authorized.

## MCP flow

1. OAuth discovery from `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.
2. Dynamic client registration at `/oauth/register`.
3. Owner authorization at `/oauth/authorize`.
4. Token exchange at `/oauth/token`.
5. MCP `initialize` against `/mcp`.
6. `notifications/initialized`.
7. `tools/list` to discover the live inventory.
8. `tools/call` for planning, QA, reads or explicitly authorized mutations.

Game Shop's server-side tool-scope authorization remains authoritative. The console cannot bypass missing OAuth scopes, paid-generation gates, GitHub-write gates, external-execution gates or deployment policy.

## Console surfaces

- Overview: projects, executions, artifacts, live tool count, system posture and recent events.
- Mission Router: website and game traffic controllers.
- Projects: searchable registered project inventory.
- Tool Deck: searchable live MCP tools with schema-driven JSON arguments and guarded invocation.
- Connections: browser OAuth plus connection details for ChatGPT and other MCP clients.

Potentially mutating/open-world tools prompt for a local browser confirmation before submission, in addition to server-side Game Shop authorization.

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
npm run test:web-console
```

This checks JavaScript syntax, the static console contract, MCP client methods, PKCE behavior, Vercel routing and the first-party redirect allowlist.

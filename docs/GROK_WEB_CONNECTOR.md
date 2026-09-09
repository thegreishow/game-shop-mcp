# Grok.com → Game Shop MCP

Game Shop supports two authentication modes:

- Grok Build / CLI: static `Authorization: Bearer $GAME_SHOP_MCP_TOKEN`
- Grok.com Custom Connector: OAuth authorization-code flow with PKCE S256

## Grok.com connector fields

- MCP URL: `https://game-shop-mcp.vercel.app/mcp`
- Client ID: `game-shop-grok-web` (or `GAME_SHOP_OAUTH_CLIENT_ID` when overridden)
- Client Secret: leave blank
- Authorization Endpoint: `https://game-shop-mcp.vercel.app/oauth/authorize`
- Token Endpoint: `https://game-shop-mcp.vercel.app/oauth/token`
- Token Auth Method: `none (PKCE only)`
- Scopes: request only what the session needs.

Suggested first connection: `gameshop.read gameshop.plan gameshop.qa`

Add `gameshop.execute` only when external or generation work is required. Add `gameshop.write` only for controlled repository mutations. Add `gameshop.deploy` only when previews/deployments are requested.

## Required production environment

- `GAME_SHOP_OAUTH_SIGNING_SECRET`
- `GAME_SHOP_OAUTH_OWNER_SECRET`
- optional `GAME_SHOP_OAUTH_CLIENT_ID`
- optional `GAME_SHOP_PUBLIC_URL=https://game-shop-mcp.vercel.app`
- optional `GAME_SHOP_OAUTH_REDIRECT_HOSTS` for additional approved callback hosts

## Discovery checks after deployment

```sh
curl -sS https://game-shop-mcp.vercel.app/.well-known/oauth-authorization-server
curl -sS https://game-shop-mcp.vercel.app/.well-known/oauth-protected-resource
```

The authorization metadata must advertise authorization-code grant, PKCE S256, and token endpoint auth method `none`.

## First Grok web mission

Use the Game Shop connector read-only. List projects, inspect the capability and integration catalogs, inspect Dubai Legends, and report which Game Shop tools were actually called. Do not create branches, write files, spend money, or deploy.

## Security

The owner approval secret is entered only on the Game Shop authorization page. Do not paste it into Grok. OAuth tokens are short-lived and scope-limited. Static gateway auth remains supported for local/CLI clients.

# Grok.com ↔ Game Shop MCP

Game Shop supports two Grok connection modes:

- Grok Build / CLI: static `Authorization: Bearer $GAME_SHOP_MCP_TOKEN` against `/mcp`.
- Grok.com Custom Connector: OAuth authorization-code flow with PKCE S256.

## Grok.com connector values

Use these values in Grok.com → Connectors → New Connector → Custom:

- Client ID: `game-shop-grok-web`
- Client Secret: leave blank
- Authorization Endpoint: `https://game-shop-mcp.vercel.app/oauth/authorize`
- Token Endpoint: `https://game-shop-mcp.vercel.app/oauth/token`
- Token Auth Method: `none (PKCE only)`
- Scopes:
  - `gameshop.read`
  - `gameshop.plan`
  - `gameshop.execute`
  - `gameshop.qa`
  - `gameshop.write`
  - `gameshop.deploy`

## Required production environment

- `GAME_SHOP_OAUTH_SIGNING_SECRET`
- `GAME_SHOP_OAUTH_OWNER_SECRET`
- `GAME_SHOP_MCP_TOKEN` (kept for CLI/static clients)

Do not put any secret in this repository.

## Expected OAuth flow

1. Grok discovers the authorization server through Game Shop's well-known metadata.
2. Grok opens `/oauth/authorize` with a PKCE S256 challenge.
3. The owner approves the requested scopes using the Game Shop owner secret.
4. Game Shop redirects Grok back with a short-lived authorization code.
5. Grok POSTs the code + verifier to `/oauth/token`.
6. Game Shop returns a scoped bearer access token.
7. Grok uses the access token against `/mcp`.

## Production verification checklist

Run only after a fresh `main` deployment exists:

```bash
curl -i https://game-shop-mcp.vercel.app/.well-known/oauth-authorization-server
curl -i https://game-shop-mcp.vercel.app/.well-known/oauth-protected-resource
```

Both should return `200` JSON and reference `https://game-shop-mcp.vercel.app`.

Then verify static CLI auth still works:

```bash
curl -i \
  -H "Authorization: Bearer ${GAME_SHOP_MCP_TOKEN}" \
  https://game-shop-mcp.vercel.app/mcp
```

A plain GET may return an MCP `405 Method not allowed`; that is acceptable. `401 Unauthorized` is not.

Finally connect Grok.com with the connector values above. The consent page should appear, the owner secret should approve access, and Grok should discover Game Shop tools after redirect.

## Permission guidance

For initial Grok.com testing, prefer the smallest useful scope set:

`gameshop.read gameshop.plan gameshop.qa`

Add `gameshop.execute`, `gameshop.write`, and `gameshop.deploy` only after the read-only path works. Game Shop's own GitHub branch restrictions, spend locks, integration locks, and deployment guards remain in force even when a broader OAuth scope is granted.

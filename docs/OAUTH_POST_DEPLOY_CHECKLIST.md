# OAuth post-deploy checklist

Run this after Vercel deployment capacity becomes available and `main` is deployed.

1. Confirm production points at the merged OAuth build.
2. Confirm `GAME_SHOP_OAUTH_SIGNING_SECRET` and `GAME_SHOP_OAUTH_OWNER_SECRET` exist in Production.
3. Run `npm run verify:oauth-live` or `npm run verify:oauth-live -- https://game-shop-mcp.vercel.app`.
4. Confirm the well-known authorization metadata returns HTTP 200.
5. Confirm the protected-resource metadata returns HTTP 200 and advertises `/mcp`.
6. In Grok.com → Connectors → New Connector → Custom, use:
   - Client ID: `game-shop-grok-web`
   - Client Secret: blank
   - Authorization endpoint: `https://game-shop-mcp.vercel.app/oauth/authorize`
   - Token endpoint: `https://game-shop-mcp.vercel.app/oauth/token`
   - Token auth: `none (PKCE only)`
   - Start with scopes: `gameshop.read gameshop.plan gameshop.qa`
7. Complete consent on Game Shop's authorization page using the owner approval secret.
8. Ask Grok web to list Game Shop projects and report the exact Game Shop tools it used.
9. Run a read-only Dubai Legends inspection.
10. Only after read-only succeeds, reconnect with `gameshop.execute`, `gameshop.write`, or `gameshop.deploy` when those privileges are actually needed.

Do not paste the owner approval secret into Grok. Rotate any gateway token that has been exposed in chat history after compatibility testing is complete.

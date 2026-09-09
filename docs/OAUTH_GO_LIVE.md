# OAuth go-live sequence

When Vercel deployment capacity returns:

1. Wait for the Git-linked `main` deployment to reach READY.
2. Run `npm run verify:oauth-live`.
3. Confirm both well-known metadata endpoints return HTTP 200.
4. Create the Grok.com Custom Connector with PKCE and no client secret.
5. Authorize with minimal scopes first: `gameshop.read gameshop.plan gameshop.qa`.
6. Complete Game Shop owner consent.
7. Run Mission 1 and verify actual Game Shop tool calls.
8. Run Mission 2 for planning.
9. Elevate to execute/write/deploy scopes only for Mission 3.
10. After compatibility testing, rotate any gateway token previously exposed in conversation logs.

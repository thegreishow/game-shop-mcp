import { OAUTH_SCOPES, oauthBase, oauthClientId } from "./oauth.js";

export function oauthReadiness(request?: Request) {
  const base = oauthBase(request);
  const signing = Boolean(process.env.GAME_SHOP_OAUTH_SIGNING_SECRET?.trim());
  const owner = Boolean(process.env.GAME_SHOP_OAUTH_OWNER_SECRET?.trim());
  const gateway = Boolean(process.env.GAME_SHOP_MCP_TOKEN?.trim());
  const configured = signing && owner;
  return {
    schemaVersion: "1.0",
    service: "Game Shop MCP OAuth",
    configured,
    staticGatewayConfigured: gateway,
    client: {
      clientId: oauthClientId(),
      clientSecretRequired: false,
      tokenAuthMethod: "none",
      pkce: "S256",
    },
    endpoints: {
      mcp: `${base}/mcp`,
      authorization: `${base}/oauth/authorize`,
      token: `${base}/oauth/token`,
      authorizationServerMetadata: `${base}/.well-known/oauth-authorization-server`,
      protectedResourceMetadata: `${base}/.well-known/oauth-protected-resource`,
    },
    scopes: OAUTH_SCOPES,
    environment: {
      signingSecret: signing ? "configured" : "missing",
      ownerSecret: owner ? "configured" : "missing",
      gatewayToken: gateway ? "configured" : "missing",
    },
    notes: [
      "No secret values are returned by this endpoint.",
      "OAuth uses authorization_code + PKCE S256.",
      "The existing static bearer-token path remains available for CLI clients.",
    ],
  };
}

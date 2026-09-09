import { oauthReadiness } from "../../src/oauth-readiness.js";

export async function GET(request: Request) {
  return new Response(JSON.stringify(oauthReadiness(request), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

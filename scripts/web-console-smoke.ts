import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { redirectAllowed } from "../src/oauth.js";

async function main(){
  const [html,js,css,vercel]=await Promise.all([
    readFile("index.html","utf8"),
    readFile("console.js","utf8"),
    readFile("console.css","utf8"),
    readFile("vercel.json","utf8"),
  ]);
  assert.match(html,/Game Shop · Control Room/);
  assert.match(html,/gameshop_route_website_workflow|Route through Game Shop/);
  assert.match(js,/method:\"initialize\"/);
  assert.match(js,/method:\"tools\/list\"/);
  assert.match(js,/method:\"tools\/call\"/);
  assert.match(js,/code_challenge_method/);
  assert.match(js,/gameshop_route_website_workflow/);
  assert.match(js,/gameshop_route_game_workflow/);
  assert.match(css,/\.tool-layout/);
  const config=JSON.parse(vercel);
  assert.ok(config.rewrites.some((x:{source:string;destination:string})=>x.source==="/console"&&x.destination==="/index.html"));
  assert.equal(redirectAllowed("https://game-shop-mcp.vercel.app/console"),true);
  assert.equal(redirectAllowed("https://gameshop.thegreishow.com/console"),true);
  assert.equal(redirectAllowed("https://evil.example/console"),false);
  console.log("Game Shop web console smoke OK: static shell, MCP client, OAuth PKCE and first-party redirect boundaries verified.");
}
main().catch(error=>{console.error(error);process.exit(1)});

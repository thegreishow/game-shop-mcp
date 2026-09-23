import assert from "node:assert/strict";
import { invalidateMissionProjectSnapshot, missionProjectSourceSnapshot } from "../src/mission-projects.js";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const keys = ["GAME_SHOP_GITHUB_TOKEN", "GITHUB_TOKEN", "GAME_SHOP_SUPABASE_URL", "GAME_SHOP_SUPABASE_SERVICE_ROLE_KEY"];
const env = keys.map((key) => [key, process.env[key]] as const);
type Request = {url:string; resolve:(response:Response)=>void; reject:(error:Error)=>void};
const requests: Request[] = [];
function finish(batch: Request[], sha: string) {
 for (const request of batch) request.resolve(Response.json(request.url.includes("/commits/") ? {sha} : {default_branch:"main"}));
}

try {
 for (const key of keys) delete process.env[key];
 process.env.GAME_SHOP_GITHUB_TOKEN = "test-only";
 globalThis.fetch = ((input: string | URL | globalThis.Request) => new Promise<Response>((resolve, reject) => {
  requests.push({url:String(input), resolve, reject});
 })) as typeof fetch;
 invalidateMissionProjectSnapshot();

 const concurrent = Array.from({length:8}, () => missionProjectSourceSnapshot("game-shop-mcp"));
 assert.equal(requests.length, 2, "Eight callers share one repository/commit read pair");
 finish(requests.splice(0), "initial");
 const results = await Promise.all(concurrent);
 assert.ok(results.every((result) => result.freshness.cached === false));
 results[0].project.name = "mutated by caller";
 assert.equal(results[1].project.name, "Game Shop");
 const hit = await missionProjectSourceSnapshot("game-shop-mcp");
 assert.equal(hit.project.name, "Game Shop");
 assert.equal(hit.freshness.cached, true);
 assert.equal(requests.length, 0);

 const old = missionProjectSourceSnapshot("game-shop-mcp", {fresh:true});
 const oldRequests = requests.splice(0);
 const fresh = missionProjectSourceSnapshot("game-shop-mcp", {fresh:true});
 const freshRequests = requests.splice(0);
 assert.equal(oldRequests.length, 2);
 assert.equal(freshRequests.length, 2);
 finish(freshRequests, "newer");
 await fresh;
 finish(oldRequests, "older");
 await old;
 const latest = await missionProjectSourceSnapshot("game-shop-mcp");
 assert.equal((latest.source as {latestCommit:{sha:string}}).latestCommit.sha, "newer");

 const invalidated = missionProjectSourceSnapshot("game-shop-mcp", {fresh:true});
 const invalidatedRequests = requests.splice(0);
 invalidateMissionProjectSnapshot();
 finish(invalidatedRequests, "invalidated");
 await invalidated;
 const afterInvalidation = missionProjectSourceSnapshot("game-shop-mcp");
 assert.equal(requests.length, 2, "Invalidated in-flight reads cannot resurrect cache entries");
 finish(requests.splice(0), "after-invalidation");
 await afterInvalidation;

 Date.now = () => originalNow() + 31_000;
 const expired = missionProjectSourceSnapshot("game-shop-mcp");
 assert.equal(requests.length, 2);
 finish(requests.splice(0), "expired-reloaded");
 await expired;
 Date.now = originalNow;

 const failed = missionProjectSourceSnapshot("game-shop-mcp", {fresh:true});
 const rejected = assert.rejects(failed, /network unavailable/);
 for (const request of requests.splice(0)) request.reject(new Error("network unavailable"));
 await rejected;
 const retry = missionProjectSourceSnapshot("game-shop-mcp");
 assert.equal(requests.length, 2, "Failed in-flight reads must not poison subsequent attempts");
 finish(requests.splice(0), "recovered");
 await retry;
 console.log("Mission snapshot smoke OK: 8 concurrent callers use 2 GitHub requests instead of 16; refresh races, invalidation, isolation, TTL and failure recovery verified.");
} finally {
 globalThis.fetch = originalFetch;
 Date.now = originalNow;
 invalidateMissionProjectSnapshot();
 for (const [key,value] of env) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
 }
}

import { webGameBackendCapabilities } from "../src/web-game-backend-capabilities.js";

const rows = webGameBackendCapabilities();
const byId = new Map(rows.map((row) => [row.id, row]));

for (const id of ["stripe-server", "supabase-js", "clerk-backend", "lootlocker-rest", "igdb-api", "phaser", "three", "fastapi"]) {
  if (!byId.has(id)) throw new Error(`Missing capability ${id}`);
}

if (byId.get("stripe-js")?.placement !== "project-dependency") throw new Error("Stripe.js must remain project-scoped");
if (byId.get("phaser")?.placement !== "project-dependency") throw new Error("Phaser must remain project-scoped");
if (byId.get("fastapi")?.placement !== "python-template") throw new Error("FastAPI must remain a Python template dependency");
if (byId.get("clerk-backend")?.packageName !== "@clerk/backend") throw new Error("Clerk must use the current backend SDK");
if (rows.some((row) => row.packageName === "@clerk/clerk-sdk-node")) throw new Error("Deprecated Clerk Node SDK must not be registered");
if (byId.get("lootlocker-rest")?.packageName) throw new Error("LootLocker must remain API-first until a current official generic npm SDK is verified");

console.log(`Web/game backend capability smoke OK: ${rows.length} classified capabilities.`);

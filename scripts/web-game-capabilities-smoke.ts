import { backendAdapterStatus } from "../src/backend-adapters.js";
import { backendReadOperationCatalog, executeBackendReadOperation } from "../src/backend-reads.js";
import { webGameBackendCapabilities } from "../src/web-game-backend-capabilities.js";

const rows = webGameBackendCapabilities();
const byId = new Map(rows.map((row) => [row.id, row]));

for (const id of ["stripe-server", "supabase-js", "firebase-admin", "clerk-backend", "lootlocker-rest", "igdb-api", "phaser", "three", "fastapi"]) {
  if (!byId.has(id)) throw new Error(`Missing capability ${id}`);
}

if (byId.get("stripe-js")?.placement !== "project-dependency") throw new Error("Stripe.js must remain project-scoped");
if (byId.get("phaser")?.placement !== "project-dependency") throw new Error("Phaser must remain project-scoped");
if (byId.get("fastapi")?.placement !== "python-template") throw new Error("FastAPI must remain a Python template dependency");
if (byId.get("firebase-web")?.placement !== "project-dependency") throw new Error("Firebase web SDK must remain project-scoped");
if (byId.get("firebase-admin")?.placement !== "core-adapter") throw new Error("Firebase Admin must remain server-side");
if (byId.get("firebase-admin")?.packageName !== "firebase-admin") throw new Error("Firebase Admin capability must use firebase-admin");
if (byId.get("clerk-backend")?.packageName !== "@clerk/backend") throw new Error("Clerk must use the current backend SDK");
if (rows.some((row) => row.packageName === "@clerk/clerk-sdk-node")) throw new Error("Deprecated Clerk Node SDK must not be registered");
if (byId.get("lootlocker-rest")?.packageName) throw new Error("LootLocker must remain API-first until a current official generic npm SDK is verified");

const adapters = backendAdapterStatus();
if (adapters.length !== 6) throw new Error(`Expected 6 wired backend adapters, found ${adapters.length}.`);
for (const id of ["supabase", "stripe", "openai", "clerk", "igdb", "firebase-admin"]) {
  const adapter = adapters.find((row) => row.id === id);
  if (!adapter) throw new Error(`Missing backend adapter ${id}`);
  if (!adapter.packageName || !adapter.version || !adapter.capabilities.length) throw new Error(`Incomplete backend adapter metadata: ${id}`);
}

const reads = backendReadOperationCatalog();
if (reads.length !== 9) throw new Error(`Expected 9 allowlisted backend reads, found ${reads.length}.`);
for (const operation of [
  "supabase.storage.list-buckets",
  "stripe.account.retrieve",
  "stripe.products.list",
  "openai.models.list",
  "clerk.users.list",
  "clerk.organizations.list",
  "igdb.games.search",
  "firebase.auth.list-users",
  "firebase.firestore.list-collections",
]) {
  if (!reads.some((row) => row.operation === operation)) throw new Error(`Missing backend read operation ${operation}`);
}

const previousExternal = process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
delete process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
let blocked = false;
try {
  await executeBackendReadOperation({ operation: "stripe.account.retrieve", execute: true });
} catch (error) {
  blocked = error instanceof Error && error.message.includes("External backend reads are disabled");
}
if (previousExternal === undefined) delete process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS;
else process.env.GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS = previousExternal;
if (!blocked) throw new Error("Backend reads must stay locked when external integrations are disabled.");

if (adapters.some((adapter) => adapter.configured)) {
  console.log("Backend adapter smoke detected local credentials; no provider request was made.");
}

console.log(`Web/game backend capability smoke OK: ${rows.length} classified capabilities; backendAdapters=${adapters.length}; backendReads=${reads.length}.`);
console.log("external backend requests executed=0");

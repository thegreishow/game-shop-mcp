import { ensureLocalBrowserAutonomy, localBrowserAutonomyStatus } from "../src/local-browser-autonomy.js";

const action = process.argv[2] === "status" ? "status" : "ensure";
const result = action === "status"
  ? await localBrowserAutonomyStatus()
  : await ensureLocalBrowserAutonomy({ startIfNeeded: true });

console.log(JSON.stringify(result, null, 2));
if (action === "ensure" && !("ready" in result && result.ready === true)) process.exitCode = 1;

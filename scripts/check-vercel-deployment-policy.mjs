import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const deploymentEnabled = config?.git?.deploymentEnabled;

const requiredRules = {
  main: true,
  "release-*": true,
  "gameshop/release-*": true,
  "**": false,
};

if (!deploymentEnabled || typeof deploymentEnabled !== "object" || Array.isArray(deploymentEnabled)) {
  console.error("Vercel deployment policy missing: git.deploymentEnabled must be an explicit branch rule map.");
  process.exit(1);
}

const mismatches = Object.entries(requiredRules).filter(
  ([pattern, expected]) => deploymentEnabled[pattern] !== expected,
);

if (mismatches.length > 0) {
  console.error("Vercel deployment policy mismatch.");
  for (const [pattern, expected] of mismatches) {
    console.error(`  ${pattern}: expected ${expected}, received ${String(deploymentEnabled[pattern])}`);
  }
  process.exit(1);
}

if (Object.prototype.hasOwnProperty.call(deploymentEnabled, "*")) {
  console.error('Vercel deployment policy must use "**": false; "*" does not safely cover slash-containing branch names.');
  process.exit(1);
}

const extraEnabled = Object.entries(deploymentEnabled).filter(
  ([pattern, enabled]) => enabled === true && !(pattern in requiredRules),
);

if (extraEnabled.length > 0) {
  console.error("Unexpected Vercel-enabled branch patterns:");
  for (const [pattern] of extraEnabled) console.error(`  ${pattern}`);
  process.exit(1);
}

console.log("Vercel deployment policy OK:");
console.log("  main -> production eligible");
console.log("  release-* -> preview eligible");
console.log("  gameshop/release-* -> preview eligible");
console.log("  ** -> all other branches disabled, including slash-containing refs");

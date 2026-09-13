import { readdir } from "node:fs/promises";

const MAX_FUNCTIONS = 10;
const entries = (await readdir(new URL("../api/", import.meta.url), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(?:ts|js|mjs|cjs)$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (entries.length > MAX_FUNCTIONS) {
  console.error(`Vercel function budget exceeded: ${entries.length}/${MAX_FUNCTIONS}`);
  console.error(entries.join("\n"));
  process.exit(1);
}

console.log(`Vercel function budget OK: ${entries.length}/${MAX_FUNCTIONS}`);
console.log(entries.join("\n"));

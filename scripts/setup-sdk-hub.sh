#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Game Shop SDK Hub setup =="
echo "Installing repository-pinned SDK dependencies from package.json..."

npm install

echo
echo "Running TypeScript validation..."
npm run typecheck

echo
echo "Running non-billable SDK Hub smoke check..."
npx tsx scripts/sdk-hub-smoke.ts

echo
echo "Refreshing machine-readable ecosystem snapshot..."
npx tsx scripts/generate-ecosystem-snapshot.ts

echo
echo "SDK Hub Phase 2 dependencies installed."
echo "No provider generation request was executed by setup."
echo "Paid generation remains gated by GAME_SHOP_ALLOW_PAID_GENERATION=true."

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Game Shop SDK Hub setup =="
echo "Installing official provider SDKs..."

npm install --save \
  replicate \
  @fal-ai/client \
  @elevenlabs/elevenlabs-js \
  @scenario-labs/sdk \
  cloudinary

echo
echo "Running TypeScript validation..."
npm run typecheck

echo
echo "Running non-billable SDK Hub smoke check..."
npx tsx scripts/sdk-hub-smoke.ts

echo
echo "SDK Hub Phase 1 packages installed."
echo "No provider generation request was executed."
echo "Paid generation remains gated by GAME_SHOP_ALLOW_PAID_GENERATION=true."

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "======================================================"
echo " Game Shop — Universal LLM Bootstrap"
echo "======================================================"
echo "Repository: $ROOT"
echo "This bootstrap never copies or prints secret values."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js >=20 is required."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js >=20 is required; found $(node -v)."
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  chmod 600 .env.local
  echo "Created .env.local from the secret-free template."
else
  echo "KEEP .env.local"
fi

if [ -f "$HOME/.config/game-shop/providers.env" ]; then
  echo "Detected local provider credential store at ~/.config/game-shop/providers.env."
  echo "Values are NOT copied into the repository."
fi

echo
echo "Installing pinned repository dependencies..."
npm install

echo
echo "Validating TypeScript..."
npm run typecheck

echo
echo "Running non-billable SDK smoke test..."
npm run test:sdk-hub

echo
echo "Running non-billable provider-health smoke test..."
npm run test:provider-health

echo
echo "Generating machine-readable ecosystem + MCP snapshots..."
npm run snapshot:ecosystem

echo
echo "Building portable LLM handoff bundle..."
npm run handoff:llm

echo
echo "======================================================"
echo " Bootstrap complete"
echo "======================================================"
echo "Read in this order from any LLM/agent:"
echo "  1. AGENTS.md"
echo "  2. ecosystem.json"
echo "  3. mcp.json"
echo "  4. docs/STANDALONE_PORTABILITY.md"
echo "  5. docs/REAL_ORCHESTRATION.md"
echo "  6. llm-handoff/manifest.json"
echo
echo "Real provider execution remains protected by:"
echo "  GAME_SHOP_ALLOW_PAID_GENERATION=true"
echo "Leave it unset unless a human intentionally authorizes paid generation."

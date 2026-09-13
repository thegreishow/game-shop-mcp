#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Game Shop: Preline setup =="

echo "Installing project-local Preline dependency..."
npm install preline

if command -v npx >/dev/null 2>&1; then
  echo
  echo "Installing official Preline Agent Skills for the current user..."
  npx -y skills add htmlstreamofficial/preline || {
    echo "WARN: Preline library installed, but Agent Skills install did not complete."
    echo "You can retry later with: npx skills add htmlstreamofficial/preline"
  }
else
  echo "WARN: npx not found; skipping Preline Agent Skills."
fi

echo
if npm ls preline --depth=0 >/dev/null 2>&1; then
  echo "READY: Preline library is installed in Game Shop."
else
  echo "ERROR: Preline dependency was not detected after installation."
  exit 1
fi

cat <<'EOF'

Preline integration status:
- Free Preline UI library: installed in Game Shop
- Agent Skills: attempted via official htmlstreamofficial/preline skill source
- Hosted Preline MCP: optional; paid/token-gated and not required for free library use
- Preline Pro: deferred until separately purchased

Game Shop can use the free library and agent skills for website/web-app build workflows without requiring Preline Pro.
EOF

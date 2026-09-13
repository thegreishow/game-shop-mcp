#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist/llm-handoff"
rm -rf "$OUT"
mkdir -p "$OUT/src" "$OUT/docs" "$OUT/scripts" "$OUT/llm-handoff" "$OUT/schemas"

copy_if_exists() {
  local src="$1"
  local dst="$2"
  if [[ -f "$ROOT/$src" ]]; then
    cp "$ROOT/$src" "$OUT/$dst"
  fi
}

# Canonical orientation + machine-readable snapshots.
copy_if_exists "AGENTS.md" "AGENTS.md"
copy_if_exists ".env.example" ".env.example"
copy_if_exists "package.json" "package.json"
copy_if_exists "ecosystem.json" "ecosystem.json"
copy_if_exists "mcp.json" "mcp.json"
copy_if_exists "schemas/artifact.schema.json" "schemas/artifact.schema.json"
copy_if_exists "llm-handoff/manifest.json" "llm-handoff/manifest.json"
copy_if_exists "llm-handoff/agent-config.json" "llm-handoff/agent-config.json"
copy_if_exists "docs/STANDALONE_PORTABILITY.md" "docs/STANDALONE_PORTABILITY.md"
copy_if_exists "docs/SDK_HUB.md" "docs/SDK_HUB.md"
copy_if_exists "docs/REAL_ORCHESTRATION.md" "docs/REAL_ORCHESTRATION.md"
copy_if_exists "docs/STANDALONE_API_ACCESS.md" "docs/STANDALONE_API_ACCESS.md"
copy_if_exists "docs/STANDALONE_MCP_ACCESS.md" "docs/STANDALONE_MCP_ACCESS.md"
copy_if_exists "docs/ECOSYSTEM.md" "docs/ECOSYSTEM.md"

# Runtime/source contracts needed by another LLM to continue implementation.
copy_if_exists "src/integrations.ts" "src/integrations.ts"
copy_if_exists "src/providers.ts" "src/providers.ts"
copy_if_exists "src/sdk-hub.ts" "src/sdk-hub.ts"
copy_if_exists "src/provider-adapters-v2.ts" "src/provider-adapters-v2.ts"
copy_if_exists "src/provider-health-v2.ts" "src/provider-health-v2.ts"
copy_if_exists "src/normalized-output.ts" "src/normalized-output.ts"
copy_if_exists "src/real-orchestration.ts" "src/real-orchestration.ts"
copy_if_exists "src/register-sdk-tools.ts" "src/register-sdk-tools.ts"
copy_if_exists "src/external-engines.ts" "src/external-engines.ts"
copy_if_exists "src/spend.ts" "src/spend.ts"
copy_if_exists "src/security.ts" "src/security.ts"
copy_if_exists "src/artifacts.ts" "src/artifacts.ts"
copy_if_exists "src/orchestrator.ts" "src/orchestrator.ts"
copy_if_exists "src/router.ts" "src/router.ts"

# Setup, health, snapshot and smoke commands.
copy_if_exists "scripts/setup-sdk-hub.sh" "scripts/setup-sdk-hub.sh"
copy_if_exists "scripts/sdk-hub-smoke.ts" "scripts/sdk-hub-smoke.ts"
copy_if_exists "scripts/provider-health-smoke.ts" "scripts/provider-health-smoke.ts"
copy_if_exists "scripts/generate-ecosystem-snapshot.ts" "scripts/generate-ecosystem-snapshot.ts"
copy_if_exists "scripts/bootstrap-universal-llm.sh" "scripts/bootstrap-universal-llm.sh"

{
  echo "# Game Shop LLM handoff bundle"
  echo
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Branch: $(git -C "$ROOT" branch --show-current 2>/dev/null || true)"
  echo "Commit: $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
  echo
  echo "Read AGENTS.md, ecosystem.json and llm-handoff/manifest.json first."
  echo "This bundle intentionally contains no secret values."
  echo "Preferred bootstrap on a new machine: npm run bootstrap:universal"
} > "$OUT/README.md"

if command -v git >/dev/null 2>&1; then
  git -C "$ROOT" ls-files > "$OUT/repository-files.txt"
fi

# Explicitly refuse common secret-bearing files if a future edit tries to copy them.
find "$OUT" -type f \( -name '.env' -o -name '.env.local' -o -name '.env.production.local' -o -name 'providers.env' \) -delete

if grep -RIlE '(^|[^A-Za-z0-9_])(sk-[A-Za-z0-9_-]{16,}|r8_[A-Za-z0-9_-]{16,}|vspk_[A-Za-z0-9_-]{16,})' "$OUT" >/tmp/game-shop-handoff-secret-hits 2>/dev/null; then
  echo "Refusing handoff export: a credential-like value was detected:" >&2
  cat /tmp/game-shop-handoff-secret-hits >&2
  rm -f /tmp/game-shop-handoff-secret-hits
  exit 1
fi
rm -f /tmp/game-shop-handoff-secret-hits

echo "LLM handoff bundle created: $OUT"
echo "Safe next step: upload that directory (or its zip) to Grok/Grokbot/another LLM."

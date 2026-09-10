#!/usr/bin/env bash
set -euo pipefail

# Phase 2 repair/addition pass for globally configured Codex MCPs.
# This script deliberately does not write secrets and does not enable paid generation.
# It is safe to re-run: additive registrations are skipped if present.

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi

exists() {
  codex mcp get "$1" >/dev/null 2>&1
}

add_remote() {
  local name="$1" url="$2"
  if exists "$name"; then
    echo "SKIP  $name (already configured)"
  else
    echo "ADD   $name -> $url"
    codex mcp add "$name" --url "$url"
  fi
}

contains() {
  local name="$1" needle="$2"
  codex mcp get "$name" 2>/dev/null | grep -Fq "$needle"
}

echo "== Game Shop standalone MCP phase 2 =="

# Newly audited direct MCPs.
add_remote "originkit" "https://mcp.originkit.dev/mcp"
add_remote "shaders" "https://shaders.com/mcp"

# ElevenLabs compatibility repair for Codex clients whose OAuth resource metadata
# resolves to the US hostname. The official global endpoint remains canonical for
# other clients, but the user's Codex run reported an explicit resource mismatch.
if exists "elevenlabs" && contains "elevenlabs" "https://api.elevenlabs.io/v1/mcp"; then
  echo "REPAIR elevenlabs -> https://api.us.elevenlabs.io/v1/mcp"
  codex mcp remove elevenlabs
  codex mcp add elevenlabs --url "https://api.us.elevenlabs.io/v1/mcp"
elif exists "elevenlabs"; then
  echo "SKIP  elevenlabs (already configured with a non-global endpoint)"
else
  echo "ADD   elevenlabs -> https://api.us.elevenlabs.io/v1/mcp"
  codex mcp add elevenlabs --url "https://api.us.elevenlabs.io/v1/mcp"
fi

cat <<'EOF'

PHASE 2 STATUS
--------------
Added/verified:
- OriginKit MCP
- Shaders MCP
- ElevenLabs Codex compatibility endpoint

Intentionally deferred from automatic mutation:
- Motion.so: keep registered; generic-agent auth uses OAuth 2.1 device flow and Codex's localhost callback is currently incompatible.
- fal MCP: current Codex OAuth discovery is incompatible with the provider metadata. Do not fake Bearer auth because fal API keys use Key semantics.
- Ludo MCP: requires ApiKey header semantics; leave registered until Codex supports the required custom auth transport or a safe local bridge is added.
- daisyUI Blueprint: requires Blueprint license + email.
- Spline MCP: requires the desktop app.
- ContextCore / WanGP: workstation-local runtimes.
- Meshy MCP: do not invent a standalone endpoint; REST remains valid.

No credentials were written. No paid-generation flag was changed.

Next:
  codex mcp list
EOF

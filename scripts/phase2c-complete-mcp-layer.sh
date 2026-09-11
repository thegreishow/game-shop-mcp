#!/usr/bin/env bash
set -euo pipefail

# Phase 2C: complete the standalone MCP layer before API work.
# Safe by default: no provider secrets are written here.
# Existing entries are preserved unless we are repairing a known auth shape.

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required. Install Node.js first."
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

add_remote_bearer() {
  local name="$1" url="$2" envvar="$3"
  if exists "$name"; then
    echo "REPAIR $name -> bearer token env $envvar"
    codex mcp remove "$name"
  else
    echo "ADD   $name -> $url (bearer env: $envvar)"
  fi
  codex mcp add "$name" --url "$url" --bearer-token-env-var "$envvar"
}

add_stdio() {
  local name="$1"; shift
  if exists "$name"; then
    echo "SKIP  $name (already configured)"
  else
    echo "ADD   $name (stdio)"
    codex mcp add "$name" -- "$@"
  fi
}

echo "== Game Shop Phase 2C: MCP completion =="

# Verified MCPs that were previously catalogued but not globally installed.
add_stdio "kibo-ui" npx -y mcp-remote "https://www.kibo-ui.com/api/mcp/mcp"
add_remote "spritesheet-forge" "https://mcp.clawstudiouo.com/mcp"
add_remote_bearer "sprixen" "https://api.sprixen.com/v1/mcp" "SPRIXEN_API_KEY"

# Repair known remote MCP auth shapes. These commands only store ENV VAR NAMES,
# never the underlying secret values.
add_remote_bearer "fal-ai" "https://mcp.fal.ai/mcp" "FAL_KEY"
add_remote_bearer "preline" "https://mcp.preline.co" "PRELINE_MCP_TOKEN"

# Meshy is an official stdio MCP package. It reads MESHY_API_KEY from its process
# environment at runtime. Registration is safe without embedding the key.
add_stdio "meshy" npx -y @meshy-ai/meshy-mcp-server

# Gamelabs exposes SSE with X-API-Key. mcp-remote interpolates the environment
# variable at runtime; the secret is not persisted in the command itself.
add_stdio "gamelabs" npx -y mcp-remote "https://mcp.gamelabstudio.co/sse" --header 'X-API-Key:${GAMELABS_API_KEY}'

cat <<'EOF'

PHASE 2C STATUS
---------------
Registered/repaired:
- Kibo UI MCP
- Spritesheet Forge MCP
- Sprixen MCP (bearer env: SPRIXEN_API_KEY)
- fal MCP (bearer env: FAL_KEY)
- Preline MCP (bearer env: PRELINE_MCP_TOKEN)
- Meshy MCP (stdio; runtime env: MESHY_API_KEY)
- Gamelabs Studio MCP (stdio bridge; runtime env: GAMELABS_API_KEY)

Still intentionally special/manual:
- Motion AI Kit: run `npx motion-ai@latest`, choose global + Codex. Its installer owns the hosted MCP wiring.
- Spline MCP: install/open Spline desktop once; Spline auto-registers itself with the ChatGPT/Codex config.
- daisyUI Blueprint MCP: requires a Blueprint license + email before registration.
- ContextCore: local Python/index runtime; install only on the workstation that will host the index.
- WanGP/Wan2GP: local GPU/model runtime; install only where the models will run.
- Ludo: already registered, but requires the nonstandard `Authentication: ApiKey ...` header. Keep it until its secret is available, then configure that header deliberately.
- Motion.so: keep current registration; its generic-agent auth path uses OAuth 2.1 device flow.

Research-only candidates are NOT installed until their official MCP contract is verified.
No paid-generation flag was enabled.

Next:
  codex mcp list
EOF

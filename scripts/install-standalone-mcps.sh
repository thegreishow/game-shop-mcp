#!/usr/bin/env bash
set -euo pipefail

# Installs/registers the verified Game Shop MCP surfaces globally in Codex.
# Safe by default: existing MCP entries are left untouched and no API keys are written.
# Run from any directory on macOS/Linux after installing Codex + Node.js.

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required for local stdio MCP servers. Install Node.js first."
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

add_stdio() {
  local name="$1"; shift
  if exists "$name"; then
    echo "SKIP  $name (already configured)"
  else
    echo "ADD   $name (stdio)"
    codex mcp add "$name" -- "$@"
  fi
}

echo "== Game Shop standalone MCP bootstrap =="
echo "Existing entries will not be replaced. Secrets are NOT stored by this script."

# The Game Shop gateway itself: orchestration path remains available in parallel.
add_remote "game-shop" "https://game-shop-mcp-thegreishows-projects.vercel.app/mcp"

# Verified public/hosted MCP endpoints from the Game Shop integration registry.
add_remote "21st-dev" "https://21st.dev/api/mcp"
add_remote "motion-so" "https://mcp.motion.so/mcp"
add_remote "raylight" "https://api.raylight.app/mcp"
add_remote "ludo-ai" "https://mcp.ludo.ai/mcp"
add_remote "fal-ai" "https://mcp.fal.ai/mcp"
add_remote "replicate" "https://mcp.replicate.com"
add_remote "elevenlabs" "https://api.elevenlabs.io/v1/mcp"
add_remote "motionsites" "https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp"
add_remote "preline" "https://mcp.preline.co"

# Verified local stdio MCP servers.
add_stdio "magic-ui" npx -y @magicuidesign/mcp@latest
add_stdio "heroui-react" npx -y @heroui/react-mcp@latest
add_stdio "heroui-native" npx -y @heroui/native-mcp@latest
add_stdio "shadcn" npx shadcn@latest mcp
add_stdio "unison-brain" npx -y @unisonlabs/mcp
add_stdio "origin-ui" npx -y github:kelvinchng/origin-ui-mcp

cat <<'EOF'

Registered the standalone-capable MCP layer.

AUTH / LOCAL FOLLOW-UP
----------------------
Some servers require OAuth, API keys, licenses, or a local desktop/runtime before they can become healthy. Registration is intentionally separate from credentials so secrets are never copied into this repo.

Run:
  codex mcp list

For OAuth-capable servers, authenticate individually as needed:
  codex mcp login <name>

Special cases kept out of automatic installation:
- daisyUI Blueprint MCP: requires a paid Blueprint LICENSE + EMAIL; install only after those values are available.
- Spline MCP: requires the Spline desktop app to be open.
- ContextCore: local-first Python backend + stdio MCP; install intentionally on the workstation that will host its index.
- WanGP/Wan2GP: local model/runtime install; not appropriate for blind global bootstrap.
- Motion AI Kit: its installer manages hosted MCP wiring; run its official installer when you want that stack enabled.
- Kibo UI: keep project/registry-specific installation separate from global MCP bootstrap until its Codex launch contract is pinned.
- Meshy: Game Shop records both MCP and REST capability, but the registry endpoint is currently the API base rather than a pinned standalone MCP URL, so this script does not invent one.
- Manus Custom MCP: Game Shop can be exposed to Manus, but it is not a separate server URL to add to Codex.
- shadcn-compatible registries (KokonutUI, Cult UI, Animate UI, Bklit UI, etc.) are consumed through the single global shadcn MCP and each target project's components.json. They do not need duplicate MCP processes.

No paid generation flag is enabled by this script.
EOF

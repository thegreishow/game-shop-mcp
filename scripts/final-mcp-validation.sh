#!/usr/bin/env bash
set -u

# Final MCP completion + validation batch.
# Goals:
# 1) detect/open Spline if available
# 2) actually probe configured MCP transports/handshakes where possible
# 3) check required credential env vars without printing secret values
# 4) classify paid/local/heavy/auth-blocked integrations cleanly
# 5) emit one READY / AUTH NEEDED / LOCAL APP NEEDED / BLOCKED report
#
# Safety:
# - never prints credential values
# - never enables paid generation
# - never installs WanGP/Wan2GP blindly
# - never embeds provider secrets into repo files
# - leaves existing Motion.so and Game Shop registrations untouched

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi

REPORT_DIR="$HOME/.local/share/game-shop"
REPORT="$REPORT_DIR/mcp-validation-report.md"
mkdir -p "$REPORT_DIR"

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t game-shop-mcp)"
trap 'rm -rf "$TMP_DIR"' EXIT

READY_ROWS=()
AUTH_ROWS=()
LOCAL_ROWS=()
BLOCKED_ROWS=()

have_mcp() {
  codex mcp get "$1" >/dev/null 2>&1
}

have_env() {
  [[ -n "${!1:-}" ]]
}

add_ready()   { READY_ROWS+=("| $1 | $2 |"); }
add_auth()    { AUTH_ROWS+=("| $1 | $2 |"); }
add_local()   { LOCAL_ROWS+=("| $1 | $2 |"); }
add_blocked() { BLOCKED_ROWS+=("| $1 | $2 |"); }

section() {
  printf '\n== %s ==\n' "$1"
}

# macOS-friendly timeout wrapper. Usage: run_with_timeout 45 command args...
run_with_timeout() {
  local seconds="$1"; shift
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$seconds" "$@" <<'PY'
import subprocess, sys
seconds = float(sys.argv[1])
cmd = sys.argv[2:]
try:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=seconds)
    if p.stdout:
        print(p.stdout, end="")
    raise SystemExit(p.returncode)
except subprocess.TimeoutExpired as e:
    if e.stdout:
        out = e.stdout.decode() if isinstance(e.stdout, bytes) else e.stdout
        print(out, end="")
    print("TIMEOUT")
    raise SystemExit(124)
PY
  else
    "$@"
  fi
}

# Reference MCP Inspector CLI probe. It returns:
# 0 success, 3 auth required, 4 unreachable (per current inspector CLI docs).
probe_http() {
  local name="$1" url="$2" transport="${3:-http}" header="${4:-}"
  local out="$TMP_DIR/${name}.out"
  local rc
  if [[ -n "$header" ]]; then
    run_with_timeout 45 npx -y @modelcontextprotocol/inspector --cli "$url" --transport "$transport" --method initialize --format json --header "$header" >"$out" 2>&1
    rc=$?
  else
    run_with_timeout 45 npx -y @modelcontextprotocol/inspector --cli "$url" --transport "$transport" --method initialize --format json >"$out" 2>&1
    rc=$?
  fi
  printf '%s' "$rc"
}

probe_stdio() {
  local name="$1"; shift
  local out="$TMP_DIR/${name}.out"
  local rc
  run_with_timeout 60 npx -y @modelcontextprotocol/inspector --cli "$@" --method initialize --format json >"$out" 2>&1
  rc=$?
  printf '%s' "$rc"
}

classify_http_oauth() {
  local name="$1" url="$2" transport="${3:-http}"
  if ! have_mcp "$name"; then
    add_blocked "$name" "not registered in Codex"
    return
  fi
  local rc
  rc="$(probe_http "$name" "$url" "$transport")"
  case "$rc" in
    0) add_ready "$name" "handshake succeeded" ;;
    3) add_ready "$name" "endpoint reached and requested auth; Codex registration is OAuth-backed" ;;
    4|124) add_blocked "$name" "endpoint unreachable or timed out during handshake" ;;
    *) add_blocked "$name" "handshake failed; inspect $TMP_DIR/${name}.out while this script is running" ;;
  esac
}

classify_http_bearer() {
  local name="$1" url="$2" env_name="$3" header_prefix="${4:-Bearer }" transport="${5:-http}"
  if ! have_mcp "$name"; then
    add_blocked "$name" "not registered in Codex"
    return
  fi
  if ! have_env "$env_name"; then
    add_auth "$name" "missing $env_name in current shell"
    return
  fi
  local secret="${!env_name}"
  local rc
  rc="$(probe_http "$name" "$url" "$transport" "Authorization: ${header_prefix}${secret}")"
  case "$rc" in
    0) add_ready "$name" "authenticated handshake succeeded" ;;
    3) add_auth "$name" "$env_name is present but provider rejected authentication" ;;
    4|124) add_blocked "$name" "endpoint unreachable or timed out" ;;
    *) add_blocked "$name" "handshake failed despite $env_name being present" ;;
  esac
}

classify_http_custom_header() {
  local name="$1" url="$2" env_name="$3" header_name="$4" header_prefix="${5:-}" transport="${6:-http}"
  if ! have_mcp "$name"; then
    add_blocked "$name" "not registered in Codex"
    return
  fi
  if ! have_env "$env_name"; then
    add_auth "$name" "missing $env_name in current shell"
    return
  fi
  local secret="${!env_name}"
  local rc
  rc="$(probe_http "$name" "$url" "$transport" "$header_name: ${header_prefix}${secret}")"
  case "$rc" in
    0) add_ready "$name" "authenticated handshake succeeded with $header_name" ;;
    3) add_auth "$name" "$env_name is present but provider rejected authentication" ;;
    4|124) add_blocked "$name" "endpoint unreachable or timed out" ;;
    *) add_blocked "$name" "handshake failed with provider-specific auth" ;;
  esac
}

classify_stdio() {
  local name="$1"; shift
  if ! have_mcp "$name"; then
    add_blocked "$name" "not registered in Codex"
    return
  fi
  local rc
  rc="$(probe_stdio "$name" "$@")"
  case "$rc" in
    0) add_ready "$name" "stdio server started and MCP initialize succeeded" ;;
    3) add_auth "$name" "server started but requires authentication" ;;
    4|124) add_blocked "$name" "stdio server failed to start or timed out" ;;
    *) add_blocked "$name" "stdio MCP initialize failed" ;;
  esac
}

section "Preflight"
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required for MCP Inspector validation."
  exit 1
fi
printf 'Codex: %s\n' "$(command -v codex)"
printf 'Node:  %s\n' "$(node --version 2>/dev/null || echo unavailable)"
printf 'npx:   %s\n' "$(command -v npx)"

section "Spline detection"
if have_mcp spline; then
  echo "READY  spline already registered"
  add_ready "spline" "registered in Codex"
elif [[ -d "/Applications/Spline.app" || -d "$HOME/Applications/Spline.app" ]]; then
  echo "OPEN   Spline desktop"
  open -a Spline >/dev/null 2>&1 || true
  sleep 5
  if have_mcp spline; then
    echo "READY  Spline opened and MCP registration appeared"
    add_ready "spline" "desktop app opened and registered MCP"
  else
    echo "LOCAL APP NEEDED  Spline is installed/opened but MCP has not registered yet"
    add_local "spline" "open Spline and enable/complete its MCP registration, then rerun"
  fi
else
  echo "LOCAL APP NEEDED  Spline.app not found"
  add_local "spline" "Spline desktop app is not installed"
fi

section "Credential presence"
for spec in \
  "fal-ai:FAL_KEY" \
  "preline:PRELINE_MCP_TOKEN" \
  "sprixen:SPRIXEN_API_KEY" \
  "meshy:MESHY_API_KEY" \
  "gamelabs:GAMELABS_API_KEY" \
  "game_shop_mcp:MCP_BEARER_TOKEN" \
  "motion-so:MOTION_API_KEY" \
  "ludo-ai:LUDO_API_KEY"; do
  name="${spec%%:*}"; env_name="${spec#*:}"
  if have_env "$env_name"; then
    echo "PRESENT $name -> $env_name"
  else
    echo "MISSING $name -> $env_name"
  fi
done

section "stdio handshake validation"
# These commands are intentionally explicit rather than parsed from config, so the
# validation remains deterministic and never has to expose Codex's config internals.
classify_stdio "heroui-native" npx -y @heroui/native-mcp@latest
classify_stdio "heroui-react" npx -y @heroui/react-mcp@latest
classify_stdio "magic-ui" npx -y @magicuidesign/mcp@latest
classify_stdio "origin-ui" npx -y github:kelvinchng/origin-ui-mcp
classify_stdio "shadcn" npx shadcn@latest mcp
classify_stdio "unison-brain" npx -y @unisonlabs/mcp
classify_stdio "kibo-ui" npx -y mcp-remote https://www.kibo-ui.com/api/mcp/mcp

if have_env MESHY_API_KEY; then
  classify_stdio "meshy" env "MESHY_API_KEY=$MESHY_API_KEY" npx -y @meshy-ai/meshy-mcp-server
else
  if have_mcp meshy; then add_auth "meshy" "missing MESHY_API_KEY in current shell"; else add_blocked "meshy" "not registered"; fi
fi

if have_env GAMELABS_API_KEY; then
  classify_stdio "gamelabs" npx -y mcp-remote https://mcp.gamelabstudio.co/sse --header "X-API-Key:${GAMELABS_API_KEY}"
else
  if have_mcp gamelabs; then add_auth "gamelabs" "missing GAMELABS_API_KEY in current shell"; else add_blocked "gamelabs" "not registered"; fi
fi

if have_mcp contextcore; then
  CC_PY="$HOME/.contextcore/.venv/bin/python"
  CC_SERVER="$HOME/.contextcore/mcp_server.py"
  if [[ -x "$CC_PY" && -f "$CC_SERVER" ]]; then
    classify_stdio "contextcore" "$CC_PY" "$CC_SERVER"
  else
    add_blocked "contextcore" "registered but local runtime files are missing"
  fi
else
  add_blocked "contextcore" "not registered in Codex"
fi

section "remote MCP transport/auth validation"
# OAuth-configured servers: a 401/403 from an unauthenticated inspector probe proves
# the MCP endpoint is alive; Codex's own list remains the source for OAuth registration state.
classify_http_oauth "21st-dev" "https://21st.dev/api/mcp"
classify_http_oauth "elevenlabs" "https://api.us.elevenlabs.io/v1/mcp"
classify_http_oauth "motionsites" "https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp"
classify_http_oauth "originkit" "https://mcp.originkit.dev/mcp"
classify_http_oauth "raylight" "https://api.raylight.app/mcp"
classify_http_oauth "replicate" "https://mcp.replicate.com"
classify_http_oauth "shaders" "https://shaders.com/mcp"
classify_http_oauth "spritesheet-forge" "https://mcp.clawstudiouo.com/mcp"

classify_http_bearer "fal-ai" "https://mcp.fal.ai/mcp" "FAL_KEY"
classify_http_bearer "preline" "https://mcp.preline.co" "PRELINE_MCP_TOKEN"
classify_http_bearer "sprixen" "https://api.sprixen.com/v1/mcp" "SPRIXEN_API_KEY"
classify_http_bearer "game_shop_mcp" "https://game-shop-mcp.vercel.app/mcp" "MCP_BEARER_TOKEN"

# Keep the duplicate project-domain Game Shop entry visible, but do not infer auth.
if have_mcp game-shop; then
  rc="$(probe_http "game-shop" "https://game-shop-mcp-thegreishows-projects.vercel.app/mcp" "http")"
  case "$rc" in
    0) add_ready "game-shop" "project-domain handshake succeeded" ;;
    3) add_auth "game-shop" "project-domain endpoint is auth-gated; no supported direct auth is configured" ;;
    4|124) add_blocked "game-shop" "project-domain endpoint unreachable/timed out" ;;
    *) add_blocked "game-shop" "project-domain handshake failed" ;;
  esac
fi

# Ludo uses provider-specific Authentication: ApiKey semantics.
if have_mcp ludo-ai; then
  if have_env LUDO_API_KEY; then
    classify_http_custom_header "ludo-ai" "https://mcp.ludo.ai/mcp" "LUDO_API_KEY" "Authentication" "ApiKey "
  else
    add_auth "ludo-ai" "missing LUDO_API_KEY; provider requires Authentication: ApiKey <key>"
  fi
else
  add_blocked "ludo-ai" "not registered"
fi

# Motion AI Kit hosted endpoints. No API key required for base; Motion+ may prompt for sign-in.
classify_http_oauth "motion" "https://mcp.motion.dev"
if have_mcp motion-plus; then
  rc="$(probe_http "motion-plus" "https://mcp.motion.dev/plus" "http")"
  case "$rc" in
    0) add_ready "motion-plus" "handshake succeeded" ;;
    3) add_auth "motion-plus" "Motion+ endpoint reached; sign-in required for Plus access" ;;
    4|124) add_blocked "motion-plus" "endpoint unreachable/timed out" ;;
    *) add_blocked "motion-plus" "handshake failed" ;;
  esac
fi

# Motion.so remains special: validate reachability only, do not mutate auth.
if have_mcp motion-so; then
  if have_env MOTION_API_KEY; then
    rc="$(probe_http "motion-so" "https://mcp.motion.so/mcp" "http" "Authorization: Bearer ${MOTION_API_KEY}")"
    case "$rc" in
      0) add_ready "motion-so" "current bearer configuration completed handshake" ;;
      3) add_auth "motion-so" "MOTION_API_KEY present but provider rejected current bearer auth; OAuth/device-flow compatibility remains special" ;;
      4|124) add_blocked "motion-so" "endpoint unreachable/timed out" ;;
      *) add_blocked "motion-so" "handshake failed with current auth configuration" ;;
    esac
  else
    add_auth "motion-so" "registered but MOTION_API_KEY is missing in current shell"
  fi
else
  add_blocked "motion-so" "not registered"
fi

section "Known paid/local/heavy MCPs"
if have_mcp daisyui-blueprint; then
  add_ready "daisyui-blueprint" "already registered"
elif have_env DAISYUI_BLUEPRINT_LICENSE && have_env DAISYUI_BLUEPRINT_EMAIL; then
  add_auth "daisyui-blueprint" "credentials exist, but registration is intentionally not embedding license/email secrets into command arguments"
else
  add_auth "daisyui-blueprint" "requires paid Blueprint license + DAISYUI_BLUEPRINT_EMAIL"
fi

# WanGP/Wan2GP: detect likely local installations, but do not download models automatically.
WAN_ROOT=""
for p in "$HOME/Wan2GP" "$HOME/WanGP" "$HOME/Documents/Wan2GP" "$HOME/Documents/WanGP" "$HOME/Documents/Codex/Wan2GP" "$HOME/Documents/Codex/WanGP"; do
  if [[ -f "$p/wgp.py" ]]; then WAN_ROOT="$p"; break; fi
done
if have_mcp wan2gp || have_mcp wangp; then
  add_ready "WanGP/Wan2GP" "MCP registration exists"
elif [[ -n "$WAN_ROOT" ]]; then
  add_local "WanGP/Wan2GP" "runtime detected at $WAN_ROOT but MCP is not registered; models/runtime must be started deliberately"
else
  add_blocked "WanGP/Wan2GP" "heavy local GPU/model runtime is not installed; intentionally not auto-installed"
fi

section "Final report"
{
  echo "# Game Shop MCP validation report"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "Interpretation: READY means the server either completed an MCP initialize handshake, or for OAuth-gated remotes the endpoint responded correctly to an auth challenge while Codex has the MCP registered. AUTH NEEDED means credentials/sign-in are missing or rejected. LOCAL APP NEEDED means a vendor desktop/local runtime action is required. BLOCKED means the server/runtime is unavailable, incompatible, or intentionally not installed."
  echo
  echo "## READY"
  echo "| MCP | Validation |"
  echo "|---|---|"
  if ((${#READY_ROWS[@]})); then printf '%s\n' "${READY_ROWS[@]}"; else echo "| — | none |"; fi
  echo
  echo "## AUTH NEEDED"
  echo "| MCP | Reason |"
  echo "|---|---|"
  if ((${#AUTH_ROWS[@]})); then printf '%s\n' "${AUTH_ROWS[@]}"; else echo "| — | none |"; fi
  echo
  echo "## LOCAL APP NEEDED"
  echo "| MCP | Reason |"
  echo "|---|---|"
  if ((${#LOCAL_ROWS[@]})); then printf '%s\n' "${LOCAL_ROWS[@]}"; else echo "| — | none |"; fi
  echo
  echo "## BLOCKED"
  echo "| MCP | Reason |"
  echo "|---|---|"
  if ((${#BLOCKED_ROWS[@]})); then printf '%s\n' "${BLOCKED_ROWS[@]}"; else echo "| — | none |"; fi
  echo
  echo "## Credential variables checked (values never printed)"
  echo "FAL_KEY, PRELINE_MCP_TOKEN, SPRIXEN_API_KEY, MESHY_API_KEY, GAMELABS_API_KEY, MCP_BEARER_TOKEN, MOTION_API_KEY, LUDO_API_KEY, DAISYUI_BLUEPRINT_LICENSE, DAISYUI_BLUEPRINT_EMAIL"
} | tee "$REPORT"

echo
printf 'Saved report: %s\n' "$REPORT"
echo "No secrets were printed. No paid-generation flag was enabled."

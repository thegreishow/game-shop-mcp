#!/usr/bin/env bash
set -u

# Repair + revalidate the standalone MCP layer after the first final validation pass.
# Fixes:
# - Inspector v2 stdio parsing when target commands contain leading-dash args
# - optional loading of the private Game Shop provider env file
# - persistent per-MCP probe logs
# - ContextCore path/backend diagnostics
# - live progress output
# Safety:
# - never prints secret values
# - never enables paid generation
# - never installs heavy WanGP/Wan2GP models
# - never mutates Motion.so auth automatically

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI not found"
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found"
  exit 1
fi

REPORT_DIR="$HOME/.local/share/game-shop"
LOG_DIR="$REPORT_DIR/mcp-validation-logs"
REPORT="$REPORT_DIR/mcp-validation-report-v2.md"
mkdir -p "$LOG_DIR"

# Load only the dedicated private provider env file created by the Game Shop setup,
# if it exists. This does not print values.
PROVIDER_ENV="$HOME/.config/game-shop/providers.env"
if [[ -f "$PROVIDER_ENV" ]]; then
  echo "LOAD  private provider env: $PROVIDER_ENV"
  set -a
  # shellcheck disable=SC1090
  source "$PROVIDER_ENV" 2>/dev/null || true
  set +a
fi

READY_ROWS=()
AUTH_ROWS=()
LOCAL_ROWS=()
BLOCKED_ROWS=()

have_mcp() { codex mcp get "$1" >/dev/null 2>&1; }
have_env() { [[ -n "${!1:-}" ]]; }
add_ready()   { READY_ROWS+=("| $1 | $2 |"); }
add_auth()    { AUTH_ROWS+=("| $1 | $2 |"); }
add_local()   { LOCAL_ROWS+=("| $1 | $2 |"); }
add_blocked() { BLOCKED_ROWS+=("| $1 | $2 |"); }

run_with_timeout() {
  local seconds="$1"; shift
  python3 - "$seconds" "$@" <<'PY'
import subprocess, sys
seconds=float(sys.argv[1]); cmd=sys.argv[2:]
try:
    p=subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=seconds)
    if p.stdout: print(p.stdout, end='')
    raise SystemExit(p.returncode)
except subprocess.TimeoutExpired as e:
    if e.stdout:
        out=e.stdout.decode() if isinstance(e.stdout, bytes) else e.stdout
        print(out, end='')
    print('TIMEOUT')
    raise SystemExit(124)
PY
}

probe_stdio() {
  local name="$1"; shift
  local out="$LOG_DIR/${name}.log"
  echo "TEST  $name (stdio)"
  # Inspector v2 requires stdio target + target args BEFORE a literal --,
  # with Inspector's own method flags AFTER the separator when target args
  # begin with '-' (for example: npx -y package).
  run_with_timeout 60 npx -y @modelcontextprotocol/inspector --cli "$@" -- --method initialize --format json >"$out" 2>&1
  return $?
}

probe_http() {
  local name="$1" url="$2" transport="${3:-http}" header="${4:-}"
  local out="$LOG_DIR/${name}.log"
  echo "TEST  $name ($transport)"
  if [[ -n "$header" ]]; then
    run_with_timeout 45 npx -y @modelcontextprotocol/inspector --cli "$url" --transport "$transport" --method initialize --format json --header "$header" >"$out" 2>&1
  else
    run_with_timeout 45 npx -y @modelcontextprotocol/inspector --cli "$url" --transport "$transport" --method initialize --format json >"$out" 2>&1
  fi
  return $?
}

classify_stdio() {
  local name="$1"; shift
  if ! have_mcp "$name"; then add_blocked "$name" "not registered in Codex"; return; fi
  if probe_stdio "$name" "$@"; then
    add_ready "$name" "stdio MCP initialize succeeded"
  else
    rc=$?
    case "$rc" in
      3) add_auth "$name" "stdio server reached but requires authentication" ;;
      124) add_blocked "$name" "stdio server timed out; see $LOG_DIR/${name}.log" ;;
      *) add_blocked "$name" "stdio initialize failed (exit $rc); see $LOG_DIR/${name}.log" ;;
    esac
  fi
}

classify_oauth_http() {
  local name="$1" url="$2" transport="${3:-http}"
  if ! have_mcp "$name"; then add_blocked "$name" "not registered in Codex"; return; fi
  if probe_http "$name" "$url" "$transport"; then
    add_ready "$name" "MCP initialize succeeded"
  else
    rc=$?
    case "$rc" in
      3) add_ready "$name" "endpoint reachable and auth-gated; Codex registration is OAuth-backed" ;;
      124|4) add_blocked "$name" "endpoint unreachable/timed out; see $LOG_DIR/${name}.log" ;;
      *) add_blocked "$name" "remote initialize failed (exit $rc); see $LOG_DIR/${name}.log" ;;
    esac
  fi
}

classify_bearer_http() {
  local name="$1" url="$2" env_name="$3" prefix="${4:-Bearer }"
  if ! have_mcp "$name"; then add_blocked "$name" "not registered in Codex"; return; fi
  if ! have_env "$env_name"; then add_auth "$name" "missing $env_name in loaded/current environment"; return; fi
  local secret="${!env_name}"
  if probe_http "$name" "$url" http "Authorization: ${prefix}${secret}"; then
    add_ready "$name" "authenticated MCP initialize succeeded"
  else
    rc=$?
    case "$rc" in
      3) add_auth "$name" "$env_name is present but authentication was rejected" ;;
      124|4) add_blocked "$name" "endpoint unreachable/timed out; see $LOG_DIR/${name}.log" ;;
      *) add_blocked "$name" "authenticated initialize failed (exit $rc); see $LOG_DIR/${name}.log" ;;
    esac
  fi
}

printf '\n== Spline ==\n'
if have_mcp spline; then
  add_ready "spline" "registered in Codex"
elif [[ -d /Applications/Spline.app || -d "$HOME/Applications/Spline.app" ]]; then
  echo "OPEN  Spline"
  open -a Spline >/dev/null 2>&1 || true
  sleep 5
  if have_mcp spline; then add_ready "spline" "desktop app opened and registered MCP"; else add_local "spline" "installed but MCP registration still needs completion in Spline"; fi
else
  add_local "spline" "Spline desktop app is not installed"
fi

printf '\n== stdio MCPs ==\n'
classify_stdio heroui-native npx -y @heroui/native-mcp@latest
classify_stdio heroui-react npx -y @heroui/react-mcp@latest
classify_stdio magic-ui npx -y @magicuidesign/mcp@latest
classify_stdio origin-ui npx -y github:kelvinchng/origin-ui-mcp
classify_stdio shadcn npx shadcn@latest mcp
classify_stdio unison-brain npx -y @unisonlabs/mcp
classify_stdio kibo-ui npx -y mcp-remote https://www.kibo-ui.com/api/mcp/mcp

if have_env MESHY_API_KEY; then
  classify_stdio meshy env "MESHY_API_KEY=$MESHY_API_KEY" npx -y @meshy-ai/meshy-mcp-server
elif have_mcp meshy; then add_auth meshy "missing MESHY_API_KEY in loaded/current environment"; else add_blocked meshy "not registered"; fi

if have_env GAMELABS_API_KEY; then
  classify_stdio gamelabs npx -y mcp-remote https://mcp.gamelabstudio.co/sse --header "X-API-Key:${GAMELABS_API_KEY}"
elif have_mcp gamelabs; then add_auth gamelabs "missing GAMELABS_API_KEY in loaded/current environment"; else add_blocked gamelabs "not registered"; fi

printf '\n== ContextCore ==\n'
if have_mcp contextcore; then
  CC_ROOT="$HOME/.contextcore"
  CC_PY="$CC_ROOT/.venv/bin/python"
  CC_SERVER="$CC_ROOT/mcp_server.py"
  CC_BOOT="$HOME/.local/share/game-shop/contextcore-bootstrap/bin/contextcore"
  if [[ -x "$CC_BOOT" ]]; then
    "$CC_BOOT" status >"$LOG_DIR/contextcore-status.log" 2>&1 || true
    "$CC_BOOT" start >>"$LOG_DIR/contextcore-status.log" 2>&1 || true
  fi
  if [[ -x "$CC_PY" && -f "$CC_SERVER" ]]; then
    classify_stdio contextcore "$CC_PY" "$CC_SERVER"
  else
    add_blocked contextcore "registered, but expected ~/.contextcore runtime files are not currently present; see $LOG_DIR/contextcore-status.log"
  fi
else
  add_blocked contextcore "not registered in Codex"
fi

printf '\n== Remote MCPs ==\n'
classify_oauth_http 21st-dev https://21st.dev/api/mcp
classify_oauth_http elevenlabs https://api.us.elevenlabs.io/v1/mcp
classify_oauth_http motionsites https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp
classify_oauth_http originkit https://mcp.originkit.dev/mcp
classify_oauth_http raylight https://api.raylight.app/mcp
classify_oauth_http replicate https://mcp.replicate.com http
classify_oauth_http shaders https://shaders.com/mcp
classify_oauth_http spritesheet-forge https://mcp.clawstudiouo.com/mcp
classify_oauth_http motion https://mcp.motion.dev http

classify_bearer_http fal-ai https://mcp.fal.ai/mcp FAL_KEY
classify_bearer_http preline https://mcp.preline.co PRELINE_MCP_TOKEN
classify_bearer_http sprixen https://api.sprixen.com/v1/mcp SPRIXEN_API_KEY
classify_bearer_http game_shop_mcp https://game-shop-mcp.vercel.app/mcp MCP_BEARER_TOKEN

if have_mcp game-shop; then
  if probe_http game-shop https://game-shop-mcp-thegreishows-projects.vercel.app/mcp http; then
    add_ready game-shop "project-domain initialize succeeded"
  else
    rc=$?; case "$rc" in 3) add_auth game-shop "project-domain endpoint is auth-gated";; *) add_blocked game-shop "project-domain initialize failed; see $LOG_DIR/game-shop.log";; esac
  fi
fi

if have_mcp ludo-ai; then
  if have_env LUDO_API_KEY; then
    secret="$LUDO_API_KEY"
    if probe_http ludo-ai https://mcp.ludo.ai/mcp http "Authentication: ApiKey ${secret}"; then add_ready ludo-ai "provider-specific ApiKey handshake succeeded"; else add_auth ludo-ai "LUDO_API_KEY present but provider-specific handshake failed; see log"; fi
  else
    add_auth ludo-ai "missing LUDO_API_KEY; provider requires Authentication: ApiKey <key>"
  fi
fi

if have_mcp motion-plus; then
  if probe_http motion-plus https://mcp.motion.dev/plus http; then add_ready motion-plus "initialize succeeded"; else rc=$?; case "$rc" in 3) add_auth motion-plus "Motion+ endpoint reachable; sign-in required";; *) add_blocked motion-plus "initialize failed; see log";; esac; fi
fi

if have_mcp motion-so; then
  if have_env MOTION_API_KEY; then
    secret="$MOTION_API_KEY"
    if probe_http motion-so https://mcp.motion.so/mcp http "Authorization: Bearer ${secret}"; then add_ready motion-so "current bearer configuration initialized"; else add_auth motion-so "current Motion.so auth did not initialize; compatibility remains special"; fi
  else
    add_auth motion-so "registered but MOTION_API_KEY is missing in loaded/current environment"
  fi
fi

printf '\n== Paid/local/heavy ==\n'
if have_mcp daisyui-blueprint; then add_ready daisyui-blueprint "registered in Codex"; elif have_env DAISYUI_BLUEPRINT_LICENSE && have_env DAISYUI_BLUEPRINT_EMAIL; then add_auth daisyui-blueprint "credentials present; registration still required"; else add_auth daisyui-blueprint "paid Blueprint license/email required"; fi

WAN_ROOT=""
for p in "$HOME/Wan2GP" "$HOME/WanGP" "$HOME/Documents/Wan2GP" "$HOME/Documents/WanGP" "$HOME/Documents/Codex/Wan2GP" "$HOME/Documents/Codex/WanGP"; do
  [[ -f "$p/wgp.py" ]] && WAN_ROOT="$p" && break
done
if have_mcp wan2gp || have_mcp wangp; then add_ready "WanGP/Wan2GP" "MCP registration exists"; elif [[ -n "$WAN_ROOT" ]]; then add_local "WanGP/Wan2GP" "runtime detected at $WAN_ROOT but MCP is not registered"; else add_blocked "WanGP/Wan2GP" "heavy local model runtime is not installed by design"; fi

printf '\n== Final report v2 ==\n'
{
  echo "# Game Shop MCP validation report v2"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  for title in READY "AUTH NEEDED" "LOCAL APP NEEDED" BLOCKED; do
    echo "## $title"
    echo "| MCP | Validation |"
    echo "|---|---|"
    case "$title" in
      READY) rows=("${READY_ROWS[@]}");;
      "AUTH NEEDED") rows=("${AUTH_ROWS[@]}");;
      "LOCAL APP NEEDED") rows=("${LOCAL_ROWS[@]}");;
      BLOCKED) rows=("${BLOCKED_ROWS[@]}");;
    esac
    if ((${#rows[@]})); then printf '%s\n' "${rows[@]}"; else echo "| — | none |"; fi
    echo
  done
  echo "Probe logs: $LOG_DIR"
  echo
  echo "No secret values were printed. No paid-generation flag was enabled."
} | tee "$REPORT"

echo
echo "Saved report: $REPORT"
echo "Saved logs:   $LOG_DIR"

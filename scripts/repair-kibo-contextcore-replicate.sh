#!/usr/bin/env bash
set -u

LOG_DIR="$HOME/.local/share/game-shop/mcp-validation-logs"
REPORT="$HOME/.local/share/game-shop/mcp-repair-report.md"
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t mcp-repair)"
trap 'rm -rf "$TMP_DIR"' EXIT

section(){ printf '\n== %s ==\n' "$1"; }
have_mcp(){ codex mcp get "$1" >/dev/null 2>&1; }
have_env(){ [[ -n "${!1:-}" ]]; }

run_timeout(){
  local seconds="$1"; shift
  python3 - "$seconds" "$@" <<'PY'
import subprocess,sys
secs=float(sys.argv[1]); cmd=sys.argv[2:]
try:
    p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=secs)
    if p.stdout: print(p.stdout,end='')
    raise SystemExit(p.returncode)
except subprocess.TimeoutExpired as e:
    if e.stdout:
        out=e.stdout.decode() if isinstance(e.stdout,bytes) else e.stdout
        print(out,end='')
    print('TIMEOUT')
    raise SystemExit(124)
PY
}

probe_http(){
  local url="$1"; local out="$2"
  run_timeout 45 npx -y @modelcontextprotocol/inspector --cli "$url" --transport http --method initialize --format json >"$out" 2>&1
}

probe_stdio(){
  local out="$1"; shift
  run_timeout 60 npx -y @modelcontextprotocol/inspector --cli -- "$@" --method initialize --format json >"$out" 2>&1
}

section "Inspect saved logs"
for f in kibo-ui.log replicate.log contextcore-status.log; do
  echo "--- $f ---"
  if [[ -f "$LOG_DIR/$f" ]]; then
    sed -n '1,220p' "$LOG_DIR/$f"
  else
    echo "MISSING: $LOG_DIR/$f"
  fi
  echo
done

section "Kibo UI"
KIBO_URL="https://www.kibo-ui.com/api/mcp/mcp"
KIBO_HTTP="$TMP_DIR/kibo-http.log"
KIBO_STDIO="$TMP_DIR/kibo-stdio.log"
KIBO_STATUS="BLOCKED"
KIBO_DETAIL="no successful probe"

echo "TEST direct Streamable HTTP endpoint"
probe_http "$KIBO_URL" "$KIBO_HTTP"; krc=$?
if [[ $krc -eq 0 || $krc -eq 3 ]]; then
  echo "PASS direct endpoint responded (rc=$krc)"
  # Prefer direct Codex URL when the endpoint itself speaks MCP successfully.
  if have_mcp kibo-ui; then codex mcp remove kibo-ui >/dev/null 2>&1 || true; fi
  codex mcp add kibo-ui --url "$KIBO_URL" >/dev/null 2>&1 || true
  KIBO_STATUS="READY"
  KIBO_DETAIL="direct MCP URL works; Codex registration switched from mcp-remote bridge to direct URL"
else
  echo "Direct endpoint did not initialize (rc=$krc); testing official mcp-remote bridge"
  probe_stdio "$KIBO_STDIO" npx -y mcp-remote "$KIBO_URL"; ksrc=$?
  if [[ $ksrc -eq 0 || $ksrc -eq 3 ]]; then
    if ! have_mcp kibo-ui; then codex mcp add kibo-ui -- npx -y mcp-remote "$KIBO_URL" >/dev/null 2>&1 || true; fi
    KIBO_STATUS="READY"
    KIBO_DETAIL="official mcp-remote bridge works; existing transport remains valid"
  else
    KIBO_STATUS="BLOCKED"
    KIBO_DETAIL="direct and bridged probes both failed; see saved repair logs"
  fi
fi
cp "$KIBO_HTTP" "$LOG_DIR/kibo-ui-direct-repair.log" 2>/dev/null || true
[[ -f "$KIBO_STDIO" ]] && cp "$KIBO_STDIO" "$LOG_DIR/kibo-ui-bridge-repair.log" 2>/dev/null || true

section "ContextCore runtime discovery"
CC_CONFIG="$TMP_DIR/contextcore-config.txt"
codex mcp get contextcore >"$CC_CONFIG" 2>&1 || true
cat "$CC_CONFIG"

# Search focused locations first, then Documents. Avoid crawling all of ~/Library.
mapfile_cmd=''
CC_SERVER=""
for root in "$HOME/.contextcore" "$HOME/.local/share" "$HOME/Documents"; do
  [[ -d "$root" ]] || continue
  hit="$(find "$root" -maxdepth 7 -type f \( -name 'mcp_server.py' -o -name '*mcp*server*.py' \) 2>/dev/null | head -n 1)"
  if [[ -n "$hit" ]]; then CC_SERVER="$hit"; break; fi
done

CC_PY=""
if [[ -n "$CC_SERVER" ]]; then
  base="$(dirname "$CC_SERVER")"
  for p in \
    "$base/.venv/bin/python" \
    "$base/venv/bin/python" \
    "$(dirname "$base")/.venv/bin/python" \
    "$HOME/.contextcore/.venv/bin/python" \
    "$HOME/.local/share/game-shop/contextcore-bootstrap/bin/python" \
    "$(command -v python3 2>/dev/null || true)"; do
    if [[ -n "$p" && -x "$p" ]]; then CC_PY="$p"; break; fi
  done
fi

CC_STATUS="BLOCKED"
CC_DETAIL="runtime not found"
if [[ -n "$CC_SERVER" && -n "$CC_PY" ]]; then
  echo "FOUND server: $CC_SERVER"
  echo "FOUND python: $CC_PY"
  if have_mcp contextcore; then codex mcp remove contextcore >/dev/null 2>&1 || true; fi
  codex mcp add contextcore -- "$CC_PY" "$CC_SERVER" >/dev/null 2>&1 || true
  probe_stdio "$TMP_DIR/contextcore-repair.log" "$CC_PY" "$CC_SERVER"; crc=$?
  if [[ $crc -eq 0 ]]; then
    CC_STATUS="READY"
    CC_DETAIL="actual runtime discovered, Codex registration repaired, initialize succeeded"
  elif [[ $crc -eq 3 ]]; then
    CC_STATUS="AUTH NEEDED"
    CC_DETAIL="runtime discovered and registered, but MCP requested authentication"
  else
    CC_STATUS="BLOCKED"
    CC_DETAIL="runtime discovered and registered, but initialize failed (rc=$crc)"
  fi
else
  echo "ContextCore runtime not found in expected focused search paths."
  CC_STATUS="BLOCKED"
  CC_DETAIL="registered previously, but no current mcp_server.py + Python runtime pair was found"
fi
cp "$TMP_DIR/contextcore-repair.log" "$LOG_DIR/contextcore-repair.log" 2>/dev/null || true

section "Replicate"
REP_STATUS="BLOCKED"
REP_DETAIL="no successful probe"

# Current official Codex path is local stdio package replicate-mcp@latest with REPLICATE_API_TOKEN.
# Do not print token values.
if have_env REPLICATE_API_TOKEN; then
  echo "REPLICATE_API_TOKEN present; switching to official Codex stdio package"
  if have_mcp replicate; then codex mcp remove replicate >/dev/null 2>&1 || true; fi
  codex mcp add replicate --env "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN" -- npx -y replicate-mcp@latest >/dev/null 2>&1 || true
  probe_stdio "$TMP_DIR/replicate-local.log" env "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN" npx -y replicate-mcp@latest; rrc=$?
  if [[ $rrc -eq 0 ]]; then
    REP_STATUS="READY"
    REP_DETAIL="repaired to Replicate's current official Codex stdio package; initialize succeeded"
  elif [[ $rrc -eq 3 ]]; then
    REP_STATUS="AUTH NEEDED"
    REP_DETAIL="official stdio package launched but token was rejected or further auth is required"
  else
    REP_STATUS="BLOCKED"
    REP_DETAIL="official stdio package failed initialize (rc=$rrc)"
  fi
else
  echo "REPLICATE_API_TOKEN missing. Testing current hosted /sse endpoint for reachability only."
  run_timeout 45 npx -y @modelcontextprotocol/inspector --cli "https://mcp.replicate.com/sse" --transport sse --method initialize --format json >"$TMP_DIR/replicate-sse.log" 2>&1
  rrc=$?
  if [[ $rrc -eq 0 ]]; then
    REP_STATUS="AUTH NEEDED"
    REP_DETAIL="hosted /sse endpoint is reachable, but official Codex setup requires REPLICATE_API_TOKEN for local replicate-mcp@latest"
  elif [[ $rrc -eq 3 ]]; then
    REP_STATUS="AUTH NEEDED"
    REP_DETAIL="hosted /sse endpoint is alive and requesting auth; set REPLICATE_API_TOKEN to use the official Codex stdio setup"
  else
    REP_STATUS="BLOCKED"
    REP_DETAIL="hosted /sse probe failed (rc=$rrc); see replicate-sse-repair.log"
  fi
fi
cp "$TMP_DIR/replicate-local.log" "$LOG_DIR/replicate-local-repair.log" 2>/dev/null || true
cp "$TMP_DIR/replicate-sse.log" "$LOG_DIR/replicate-sse-repair.log" 2>/dev/null || true

section "Repair summary"
{
  echo "# MCP focused repair report"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "| MCP | Status | Detail |"
  echo "|---|---|---|"
  echo "| kibo-ui | $KIBO_STATUS | $KIBO_DETAIL |"
  echo "| contextcore | $CC_STATUS | $CC_DETAIL |"
  echo "| replicate | $REP_STATUS | $REP_DETAIL |"
  echo
  echo "Saved diagnostic logs: $LOG_DIR"
} | tee "$REPORT"

echo
codex mcp list || true
echo
echo "Saved report: $REPORT"

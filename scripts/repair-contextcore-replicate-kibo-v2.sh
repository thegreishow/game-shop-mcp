#!/usr/bin/env bash
set -u

# Focused repair pass after MCP validation.
# - Kibo: verify current official endpoint/bridge, but do not mutate on vendor 5xx.
# - ContextCore: recover the real SDK/runtime root instead of using site-packages mcp_server.py.
# - Replicate: prefer official Codex stdio package when a token is actually available.
#
# Safety: no secrets are printed; no paid-generation flag is enabled.

REPORT_DIR="$HOME/.local/share/game-shop"
LOG_DIR="$REPORT_DIR/mcp-validation-logs"
REPORT="$REPORT_DIR/mcp-focused-repair-v2.md"
mkdir -p "$LOG_DIR"

have_mcp() { codex mcp get "$1" >/dev/null 2>&1; }
run_timeout() {
  local seconds="$1"; shift
  python3 - "$seconds" "$@" <<'PY'
import subprocess, sys
sec=float(sys.argv[1]); cmd=sys.argv[2:]
try:
    p=subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=sec)
    if p.stdout: print(p.stdout, end='')
    raise SystemExit(p.returncode)
except subprocess.TimeoutExpired as e:
    if e.stdout:
        out=e.stdout.decode() if isinstance(e.stdout,bytes) else e.stdout
        print(out,end='')
    print('TIMEOUT')
    raise SystemExit(124)
PY
}

ROWS=()
row(){ ROWS+=("| $1 | $2 | $3 |"); }

printf '\n== Kibo UI ==\n'
KIBO_LOG="$LOG_DIR/kibo-ui-v2.log"
: > "$KIBO_LOG"
# Official docs still specify this exact bridge command. Retry to distinguish transient failure from local syntax.
KIBO_OK=0
for i in 1 2 3; do
  echo "Attempt $i/3: official mcp-remote bridge"
  if run_timeout 35 npx -y @modelcontextprotocol/inspector --cli -- npx -y mcp-remote https://www.kibo-ui.com/api/mcp/mcp --method initialize --format json >>"$KIBO_LOG" 2>&1; then
    KIBO_OK=1; break
  fi
  sleep 2
done
if [[ "$KIBO_OK" == 1 ]]; then
  row "kibo-ui" "READY" "official bridge initialized successfully"
else
  if grep -Eq 'code[:= ]+500|500|Internal Server Error' "$KIBO_LOG"; then
    row "kibo-ui" "BLOCKED" "official endpoint is returning HTTP 500; vendor-side failure, registration left unchanged"
  else
    row "kibo-ui" "BLOCKED" "official bridge still fails; see kibo-ui-v2.log"
  fi
fi

printf '\n== ContextCore ==\n'
CC_STATUS="$LOG_DIR/contextcore-status-v2.log"
CC_DOCTOR="$LOG_DIR/contextcore-doctor-v2.log"
CC_PROBE="$LOG_DIR/contextcore-v2.log"
CC_BIN=""
for p in \
  "$HOME/.local/share/game-shop/contextcore-bootstrap/bin/contextcore" \
  "$HOME/.local/bin/contextcore"; do
  [[ -x "$p" ]] && { CC_BIN="$p"; break; }
done
if [[ -z "$CC_BIN" ]] && command -v contextcore >/dev/null 2>&1; then CC_BIN="$(command -v contextcore)"; fi

[[ -n "$CC_BIN" ]] && "$CC_BIN" status >"$CC_STATUS" 2>&1 || true
[[ -n "$CC_BIN" ]] && "$CC_BIN" doctor >"$CC_DOCTOR" 2>&1 || true

# Determine SDK root from saved config first. ContextCore docs say update/register target the saved sdk_root.
SDK_ROOT=""
CFG="$HOME/.contextcore/contextcore.yaml"
if [[ -f "$CFG" ]]; then
  SDK_ROOT="$(python3 - "$CFG" <<'PY'
import sys,re
p=sys.argv[1]
try:
    for line in open(p, encoding='utf-8'):
        m=re.match(r'^\s*sdk_root\s*:\s*["\x27]?(.+?)["\x27]?\s*$', line)
        if m:
            print(m.group(1).strip()); break
except Exception:
    pass
PY
)"
fi

# Fallback to canonical ~/.contextcore pair, then to source roots that contain both files.
CC_PY=""; CC_SERVER=""; CC_CWD=""
if [[ -x "$HOME/.contextcore/.venv/bin/python" && -f "$HOME/.contextcore/mcp_server.py" ]]; then
  CC_PY="$HOME/.contextcore/.venv/bin/python"
  CC_SERVER="$HOME/.contextcore/mcp_server.py"
  CC_CWD="$HOME/.contextcore"
elif [[ -n "$SDK_ROOT" && -f "$SDK_ROOT/mcp_server.py" ]]; then
  for py in "$SDK_ROOT/.venv/bin/python" "$HOME/.contextcore/.venv/bin/python" "$HOME/.local/share/game-shop/contextcore-bootstrap/bin/python"; do
    if [[ -x "$py" ]]; then CC_PY="$py"; break; fi
  done
  if [[ -n "$CC_PY" ]]; then CC_SERVER="$SDK_ROOT/mcp_server.py"; CC_CWD="$SDK_ROOT"; fi
fi

# Search narrowly for a real source checkout if config/canonical paths did not resolve.
if [[ -z "$CC_SERVER" ]]; then
  while IFS= read -r f; do
    d="$(dirname "$f")"
    # Reject site-packages generic module; ContextCore MCP source should live with project/source files.
    [[ "$f" == *site-packages* ]] && continue
    if [[ -f "$d/mcp_server.py" ]]; then
      for py in "$d/.venv/bin/python" "$HOME/.contextcore/.venv/bin/python" "$HOME/.local/share/game-shop/contextcore-bootstrap/bin/python"; do
        if [[ -x "$py" ]]; then CC_PY="$py"; CC_SERVER="$d/mcp_server.py"; CC_CWD="$d"; break 2; fi
      done
    fi
  done < <(find "$HOME/.contextcore" "$HOME/Documents" "$HOME/.local/share/game-shop" -maxdepth 6 -name detect_paths.py -type f 2>/dev/null | head -20)
fi

if [[ -n "$CC_PY" && -n "$CC_SERVER" ]]; then
  echo "Resolved ContextCore python: $CC_PY"
  echo "Resolved ContextCore server: $CC_SERVER"
  echo "Resolved ContextCore cwd:    $CC_CWD"

  WRAP="$REPORT_DIR/contextcore-mcp-wrapper.sh"
  cat > "$WRAP" <<EOF
#!/usr/bin/env bash
export CONTEXTCORE_API_BASE_URL="http://127.0.0.1:8000"
export CONTEXTCORE_MCP_TIMEOUT_SECONDS="120"
cd "$CC_CWD"
exec "$CC_PY" "$CC_SERVER"
EOF
  chmod 700 "$WRAP"

  # Replace only the ContextCore registration with the recovered canonical/source runtime.
  codex mcp remove contextcore >/dev/null 2>&1 || true
  codex mcp add contextcore -- "$WRAP" >/dev/null 2>&1 || true

  if run_timeout 60 npx -y @modelcontextprotocol/inspector --cli -- "$WRAP" --method initialize --format json >"$CC_PROBE" 2>&1; then
    row "contextcore" "READY" "real SDK/runtime discovered; backend + stdio MCP initialize succeeded"
  else
    if curl -fsS --max-time 5 http://127.0.0.1:8000/health >/dev/null 2>&1; then
      row "contextcore" "BLOCKED" "backend is healthy but stdio MCP still fails; see contextcore-v2.log and doctor log"
    else
      row "contextcore" "LOCAL APP NEEDED" "runtime found but backend health check failed; run contextcore start/restart"
    fi
  fi
else
  # Undo the incorrect site-packages registration if that is what is currently configured.
  if codex mcp get contextcore 2>/dev/null | grep -q 'site-packages/mcp_server.py'; then
    codex mcp remove contextcore >/dev/null 2>&1 || true
  fi
  row "contextcore" "LOCAL APP NEEDED" "ContextCore backend is installed, but canonical/source mcp_server.py + matching Python could not be resolved; see status/doctor logs"
fi

printf '\n== Replicate ==\n'
# Load common private provider-env files if present, never printing values.
REPL_ENV_FILE=""
for f in \
  "$HOME/.config/game-shop/providers.env" \
  "$HOME/.config/game-shop/provider.env" \
  "$HOME/.config/game-shop/.env" \
  "$HOME/.local/share/game-shop/providers.env" \
  "$PWD/.env.local" \
  "$PWD/.env.game-shop.local"; do
  if [[ -f "$f" ]]; then
    set -a; source "$f" >/dev/null 2>&1 || true; set +a
    if [[ -n "${REPLICATE_API_TOKEN:-}" ]]; then REPL_ENV_FILE="$f"; break; fi
  fi
done

REPL_LOG="$LOG_DIR/replicate-v2.log"
if [[ -n "${REPLICATE_API_TOKEN:-}" ]]; then
  # Keep token out of Codex command arguments. If it came from a persistent private env file,
  # use a wrapper that sources that file; otherwise rely on process environment and note it.
  WRAP="$REPORT_DIR/replicate-mcp-wrapper.sh"
  if [[ -n "$REPL_ENV_FILE" ]]; then
    cat > "$WRAP" <<EOF
#!/usr/bin/env bash
set -a
source "$REPL_ENV_FILE"
set +a
exec npx -y replicate-mcp@latest
EOF
  else
    cat > "$WRAP" <<'EOF'
#!/usr/bin/env bash
exec npx -y replicate-mcp@latest
EOF
  fi
  chmod 700 "$WRAP"
  codex mcp remove replicate >/dev/null 2>&1 || true
  codex mcp add replicate -- "$WRAP" >/dev/null 2>&1 || true

  if run_timeout 60 npx -y @modelcontextprotocol/inspector --cli -- "$WRAP" --method initialize --format json >"$REPL_LOG" 2>&1; then
    row "replicate" "READY" "repaired to official Codex stdio package replicate-mcp@latest"
  else
    row "replicate" "AUTH NEEDED" "token was found but official stdio initialize still failed; see replicate-v2.log"
  fi
else
  # Verify the current hosted server path is /sse; do not destroy existing OAuth registration without token.
  if run_timeout 35 npx -y @modelcontextprotocol/inspector --cli https://mcp.replicate.com/sse --transport sse --method initialize --format json >"$REPL_LOG" 2>&1; then
    row "replicate" "READY" "hosted /sse endpoint initialized"
  elif grep -Eqi '401|403|auth|unauthorized|forbidden' "$REPL_LOG"; then
    row "replicate" "AUTH NEEDED" "current hosted /sse endpoint is reachable; REPLICATE_API_TOKEN is required for the official Codex stdio setup"
  else
    row "replicate" "AUTH NEEDED" "REPLICATE_API_TOKEN not found; official Codex stdio setup cannot be completed safely"
  fi
fi

printf '\n== Focused repair v2 report ==\n'
{
  echo "# MCP focused repair report v2"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "| MCP | Status | Detail |"
  echo "|---|---|---|"
  printf '%s\n' "${ROWS[@]}"
  echo
  echo "Logs: $LOG_DIR"
  echo "No secret values were printed. No paid-generation flag was enabled."
} | tee "$REPORT"

echo
codex mcp list || true
echo
printf 'Saved report: %s\n' "$REPORT"

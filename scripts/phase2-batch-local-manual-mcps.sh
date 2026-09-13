#!/usr/bin/env bash
set -u

# Batched completion pass for the remaining local/manual MCP layer.
# Safe defaults:
# - no provider secrets are written
# - no paid-generation flag is enabled
# - heavy GPU/model stacks are not installed blindly
# - steps continue when one optional integration cannot complete

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi

have_mcp() {
  codex mcp get "$1" >/dev/null 2>&1
}

section() {
  printf '\n== %s ==\n' "$1"
}

section "Game Shop batched MCP completion"

# 1) Motion AI Kit — skip if its hosted MCPs already exist.
section "Motion AI Kit"
if have_mcp motion || have_mcp motion-plus; then
  echo "SKIP  Motion AI Kit already configured"
elif command -v npx >/dev/null 2>&1; then
  echo "RUN   Motion AI Kit installer (choose Global + Codex)"
  npx motion-ai@latest || echo "WARN  Motion AI Kit installer did not complete"
else
  echo "WARN  npx unavailable; Motion AI Kit skipped"
fi

# 2) ContextCore — install inside an isolated venv to avoid PEP 668/Homebrew Python issues.
section "ContextCore"
CC_BOOTSTRAP_VENV="$HOME/.local/share/game-shop/contextcore-bootstrap"
CC_BOOTSTRAP_BIN="$CC_BOOTSTRAP_VENV/bin/contextcore"
CC_PY="$HOME/.contextcore/.venv/bin/python"
CC_SERVER="$HOME/.contextcore/mcp_server.py"

if have_mcp contextcore; then
  echo "SKIP  contextcore MCP already registered"
elif ! command -v python3 >/dev/null 2>&1; then
  echo "WARN  python3 unavailable; ContextCore skipped"
else
  if [[ ! -x "$CC_BOOTSTRAP_BIN" ]]; then
    echo "CREATE isolated ContextCore bootstrap venv"
    python3 -m venv "$CC_BOOTSTRAP_VENV" || true
    if [[ -x "$CC_BOOTSTRAP_VENV/bin/python" ]]; then
      "$CC_BOOTSTRAP_VENV/bin/python" -m pip install --upgrade pip >/dev/null 2>&1 || true
      "$CC_BOOTSTRAP_VENV/bin/python" -m pip install contextcore==1.0.0 || true
    fi
  fi

  if [[ -x "$CC_BOOTSTRAP_BIN" ]]; then
    echo "RUN   contextcore init"
    "$CC_BOOTSTRAP_BIN" init || echo "WARN  ContextCore init did not complete"
  fi

  if [[ -x "$CC_PY" && -f "$CC_SERVER" ]]; then
    echo "ADD   contextcore MCP"
    codex mcp add contextcore -- "$CC_PY" "$CC_SERVER" || echo "WARN  ContextCore registration failed"
  else
    echo "WARN  ContextCore MCP runtime files not found yet at expected default paths"
  fi
fi

# 3) Spline — opening the desktop app is the vendor-owned registration path.
section "Spline desktop MCP"
if have_mcp spline; then
  echo "SKIP  spline MCP already registered"
elif [[ -d "/Applications/Spline.app" || -d "$HOME/Applications/Spline.app" ]]; then
  echo "OPEN  Spline desktop so it can perform its MCP registration"
  open -a Spline || echo "WARN  Could not open Spline automatically"
else
  echo "PENDING  Spline.app not detected; install/open Spline desktop to register its MCP"
fi

# 4) daisyUI Blueprint — can only be completed when license/email are available.
section "daisyUI Blueprint MCP"
if have_mcp daisyui-blueprint; then
  echo "SKIP  daisyUI Blueprint already registered"
elif [[ -n "${DAISYUI_BLUEPRINT_LICENSE:-}" && -n "${DAISYUI_BLUEPRINT_EMAIL:-}" ]]; then
  echo "READY  Blueprint credentials are present in the current shell."
  echo "PENDING  Registration is intentionally not embedding those secrets into command arguments."
  echo "         Configure them through the supported Codex MCP environment mechanism, then register:"
  echo "         npx -y daisyui-blueprint@latest"
else
  echo "PENDING  requires DAISYUI_BLUEPRINT_LICENSE + DAISYUI_BLUEPRINT_EMAIL"
fi

# 5) WanGP/Wan2GP — deliberately no blind install because this is a heavy local model stack.
section "WanGP / Wan2GP"
if have_mcp wangp || have_mcp wan2gp; then
  echo "SKIP  WanGP/Wan2GP MCP already registered"
else
  echo "PENDING  heavy local GPU/model runtime; not installed blindly by the batch"
  echo "         Once the runtime exists locally, start it with MCP stdio/HTTP and register that endpoint."
fi

# 6) Ludo — registered already, but direct Codex custom ApiKey-header support remains the blocker.
section "Ludo MCP"
if have_mcp ludo-ai; then
  echo "PRESENT  ludo-ai is registered"
  echo "PENDING  provider requires Authentication: ApiKey <key>; keep registration until a safe custom-header path is configured"
else
  echo "PENDING  ludo-ai is not registered"
fi

# 7) Motion.so — keep current registration; do not mutate its auth automatically.
section "Motion.so MCP"
if have_mcp motion-so; then
  echo "PRESENT  motion-so is registered; leaving current auth untouched"
else
  echo "PENDING  motion-so is not registered"
fi

section "Final Codex MCP inventory"
codex mcp list || true

cat <<'EOF'

BATCH COMPLETE
--------------
This batch intentionally maximizes safe progress in one run.
Anything left as PENDING is blocked by one of: vendor desktop install, paid license/credentials,
heavy local model runtime, or a nonstandard authentication transport.

No provider secrets were written and no paid-generation flag was enabled.
EOF

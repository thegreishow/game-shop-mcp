#!/usr/bin/env bash
set -euo pipefail

# Phase 2D: install the remaining local/manual MCPs that can be safely progressed
# from a workstation without writing provider secrets into this repository.
#
# This script intentionally leaves Spline, daisyUI Blueprint, WanGP/Wan2GP,
# Ludo custom-header auth, and Motion.so device-flow handling as separate steps.

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex CLI is not installed or not on PATH."
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required for Motion AI Kit. Install Node.js first."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required for ContextCore."
  exit 1
fi

echo "== Game Shop Phase 2D: local/manual MCPs =="

echo
echo "[1/2] Motion AI Kit"
echo "Launching the official installer. Choose GLOBAL installation and Codex when offered."
echo "If Codex is not listed explicitly, use the installer's custom-agent/custom-folder path as documented by Motion."
npx motion-ai@latest

echo
echo "[2/2] ContextCore"
if command -v contextcore >/dev/null 2>&1; then
  echo "SKIP  ContextCore package already installed"
else
  echo "INSTALL ContextCore from PyPI"
  python3 -m pip install --user contextcore==1.0.0
fi

if command -v contextcore >/dev/null 2>&1; then
  echo "RUN   contextcore init"
  contextcore init
else
  echo "ContextCore command is not yet on PATH after pip install."
  echo "Re-open Terminal or add your Python user bin directory to PATH, then run: contextcore init"
fi

CC_PY="$HOME/.contextcore/.venv/bin/python"
CC_SERVER="$HOME/.contextcore/mcp_server.py"

if [[ -x "$CC_PY" && -f "$CC_SERVER" ]]; then
  if codex mcp get contextcore >/dev/null 2>&1; then
    echo "SKIP  contextcore MCP already registered"
  else
    echo "ADD   contextcore MCP to Codex"
    codex mcp add contextcore -- "$CC_PY" "$CC_SERVER"
  fi
else
  echo "ContextCore MCP files are not present yet at the expected default paths."
  echo "After init completes, verify:"
  echo "  $CC_PY"
  echo "  $CC_SERVER"
  echo "Then register manually with:"
  echo "  codex mcp add contextcore -- \"$CC_PY\" \"$CC_SERVER\""
fi

cat <<'EOF'

PHASE 2D STATUS
---------------
Progressed now:
- Motion AI Kit official installer launched.
- ContextCore package/init/registration attempted using its default local runtime paths.

Still manual/special after this pass:
- Spline MCP: install/open Spline desktop; it owns the local MCP registration.
- daisyUI Blueprint MCP: requires a paid Blueprint license + email.
- WanGP/Wan2GP: local GPU/model runtime; install only on the machine that will host the models.
- Ludo MCP: requires custom `Authentication: ApiKey ...` header semantics.
- Motion.so: keep current registration; generic-agent auth is device-flow based.

No provider secrets are written by this script. No paid-generation flag is enabled.

Next:
  codex mcp list
EOF

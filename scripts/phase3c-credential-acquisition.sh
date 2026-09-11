#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/game-shop"
ENV_FILE="$CONFIG_DIR/providers.env"
REPORT_DIR="$HOME/.local/share/game-shop"
REPORT="$REPORT_DIR/phase3c-credential-acquisition.md"
mkdir -p "$CONFIG_DIR" "$REPORT_DIR"
chmod 700 "$CONFIG_DIR"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE. Run scripts/setup-standalone-api-env.sh first."; exit 1; }
chmod 600 "$ENV_FILE"

# Never echo secret values. All entry uses silent terminal input.
set_value(){
  local name="$1" label="$2"
  local current=""
  current="$(python3 - "$ENV_FILE" "$name" <<'PY'
import re,sys
p,n=sys.argv[1:]
for line in open(p):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',line.rstrip('\n'))
    if m and m.group(1)==n:
        print('present' if m.group(2) else '')
        break
PY
)"
  if [[ "$current" == "present" ]]; then
    printf 'KEEP  %-30s configured\n' "$name"
    return
  fi
  printf '\n%s\n' "$label"
  printf 'Paste %s (hidden; Enter to skip): ' "$name"
  IFS= read -r -s value || true
  printf '\n'
  [[ -n "${value:-}" ]] || { printf 'SKIP  %s\n' "$name"; return; }
  VALUE="$value" python3 - "$ENV_FILE" "$name" <<'PY'
import os,re,sys,tempfile
p,n=sys.argv[1:]; v=os.environ['VALUE']
lines=open(p).read().splitlines(); found=False
for i,line in enumerate(lines):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',line)
    if m and m.group(1)==n:
        lines[i]=f'{n}={v}'; found=True; break
if not found: lines.append(f'{n}={v}')
fd,tmp=tempfile.mkstemp(dir=os.path.dirname(p),prefix='.providers.',text=True)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(tmp,0o600); os.replace(tmp,p)
PY
  unset value
  printf 'SAVE  %s\n' "$name"
}

open_url(){
  local url="$1"
  if command -v open >/dev/null 2>&1; then open "$url" >/dev/null 2>&1 || true; else printf '%s\n' "$url"; fi
}

cat <<'EOF'
== Phase 3C: credential acquisition ==

This batch is for direct standalone access. It does not send credentials to ChatGPT,
GitHub, or Game Shop. Values are written only to ~/.config/game-shop/providers.env.

First we will open official provider pages for the highest-value verified integrations.
Create/copy keys in the browser, then return here and paste them into the hidden prompts.
Skip anything you do not want yet.
EOF

printf '\nOpen official credential/docs pages now? [Y/n] '
IFS= read -r answer || true
if [[ ! "${answer:-}" =~ ^[Nn]$ ]]; then
  open_url "https://replicate.com/account/api-tokens"
  open_url "https://elevenlabs.io/docs/api-reference/authentication"
  open_url "https://api-docs.deepseek.com/"
  open_url "https://docs.meshy.ai/en/api/authentication"
  open_url "https://fal.ai/docs"
  open_url "https://open.manus.im/docs/v2/authentication"
  open_url "https://docs.motion.so/"
  open_url "https://ludo.ai/docs/api-mcp"
  open_url "https://www.podium.build/"
  open_url "https://help.aimlapi.com/article/19-how-to-create-an-api-key"
  open_url "https://docs.scenario.com/get-started/documentation/key-concepts-terminology/api-key-and-authentication"
  open_url "https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials"
fi

cat <<'EOF'

-- Group A: high-value standalone generation / agent APIs --
EOF
set_value REPLICATE_API_TOKEN "Replicate API token (account API tokens page; token normally starts r8_)"
set_value ELEVENLABS_API_KEY "ElevenLabs API key (OAuth MCP can work without this, but the REST API needs it)"
set_value DEEPSEEK_API_KEY "DeepSeek API key"
set_value MESHY_API_KEY "Meshy API key"
set_value FAL_KEY "fal API key"
set_value MANUS_API_KEY "Manus API v2 key"

cat <<'EOF'

-- Group B: motion / multimodal / commerce APIs --
EOF
set_value MOTION_SO_API_KEY "Mosaic Motion API key (REST API uses Bearer auth; API jobs consume Motion credits)"
set_value LUDO_API_KEY "Ludo API/MCP key (API/MCP access depends on a compatible Ludo plan)"
set_value PODIUM_API_KEY "Podium API key"
set_value AIMLAPI_API_KEY "AI/ML API key"
set_value SCENARIO_API_KEY "Scenario API key (Starter plan or above is required for API keys)"
set_value SCENARIO_API_SECRET "Scenario API secret paired with the Scenario API key"
set_value CLOUDINARY_URL "Cloudinary CLOUDINARY_URL credential string"

cat <<'EOF'

-- Group C: standalone MCP credentials already wired in Codex --
EOF
set_value PRELINE_MCP_TOKEN "Preline MCP token"
set_value SPRIXEN_API_KEY "Sprixen API/MCP key"
set_value GAMELABS_API_KEY "Gamelabs Studio MCP API key"
set_value MOTION_API_KEY "Motion.so MCP fallback/service-account key if you use key auth instead of OAuth"
set_value DAISYUI_BLUEPRINT_LICENSE "daisyUI Blueprint license (skip unless you own Blueprint)"
set_value DAISYUI_BLUEPRINT_EMAIL "daisyUI Blueprint account email"

cat <<'EOF'

-- Group D: Game Shop-specific/direct gateway auth --
EOF
set_value MCP_BEARER_TOKEN "Direct Game Shop MCP bearer token (only if you already created one for your deployment)"

cat <<'EOF'

-- Existing-account game-art adapters --
These are kept because Game Shop already has or planned provider adapters, but we do not
open acquisition pages for products whose public standalone contract was not re-verified in
this pass. Enter only keys you already legitimately have; otherwise skip them.
EOF
set_value AUTOSPRITE_API_KEY "AutoSprite API key (existing account only)"
set_value SPRITECOOK_API_KEY "SpriteCook API key (existing account only)"

# Normalize intentional aliases after entry.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
python3 - "$ENV_FILE" <<'PY'
import re,sys,tempfile,os
p=sys.argv[1]; lines=open(p).read().splitlines(); vals={}; pos={}
for i,l in enumerate(lines):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',l)
    if m: vals[m.group(1)]=m.group(2); pos[m.group(1)]=i
pairs=[('MOTION_SO_API_KEY','MOTION_API_KEY'),('PRELINE_API_KEY','PRELINE_MCP_TOKEN')]
for a,b in pairs:
    av,bv=vals.get(a,''),vals.get(b,'')
    if av and not bv:
        if b in pos: lines[pos[b]]=f'{b}={av}'
        else: lines.append(f'{b}={av}')
    elif bv and not av:
        if a in pos: lines[pos[a]]=f'{a}={bv}'
        else: lines.append(f'{a}={bv}')
fd,tmp=tempfile.mkstemp(dir=os.path.dirname(p),prefix='.providers.',text=True)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(tmp,0o600); os.replace(tmp,p)
PY

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

vars=(REPLICATE_API_TOKEN ELEVENLABS_API_KEY DEEPSEEK_API_KEY MESHY_API_KEY FAL_KEY MANUS_API_KEY MOTION_SO_API_KEY LUDO_API_KEY PODIUM_API_KEY AIMLAPI_API_KEY SCENARIO_API_KEY SCENARIO_API_SECRET CLOUDINARY_URL PRELINE_MCP_TOKEN SPRIXEN_API_KEY GAMELABS_API_KEY MOTION_API_KEY DAISYUI_BLUEPRINT_LICENSE DAISYUI_BLUEPRINT_EMAIL MCP_BEARER_TOKEN AUTOSPRITE_API_KEY SPRITECOOK_API_KEY)
{
  echo '# Phase 3C credential acquisition status'
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo '| Variable | Status |'
  echo '|---|---|'
  for n in "${vars[@]}"; do
    if [[ -n "${!n:-}" ]]; then echo "| $n | configured |"; else echo "| $n | missing/skipped |"; fi
  done
  echo
  echo 'No secret values are printed.'
  echo 'No generation or billable provider request was made.'
} > "$REPORT"

cat "$REPORT"
echo
echo "Saved report: $REPORT"
echo "Next: bash scripts/phase3-standalone-api-completion.sh"

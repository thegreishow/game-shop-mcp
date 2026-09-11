#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/game-shop"
ENV_FILE="$CONFIG_DIR/providers.env"
REPORT_DIR="$HOME/.local/share/game-shop"
REPORT="$REPORT_DIR/standalone-credential-consolidation.md"
mkdir -p "$CONFIG_DIR" "$REPORT_DIR"
chmod 700 "$CONFIG_DIR"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE. Run setup-standalone-api-env.sh first."; exit 1; }
chmod 600 "$ENV_FILE"

vars=(
  AUTOSPRITE_API_KEY SPRITECOOK_API_KEY SPRITESHIP_API_KEY SPRITE_AI_API_KEY SPRITESHEET_AI_API_KEY
  AIMLAPI_API_KEY DEEPSEEK_API_KEY MESHY_API_KEY FAL_KEY REPLICATE_API_TOKEN ELEVENLABS_API_KEY
  SCENARIO_API_KEY SCENARIO_API_SECRET MANUS_API_KEY MOTION_SO_API_KEY LUDO_API_KEY PODIUM_API_KEY
  CLOUDINARY_URL ORIGINKIT_API_KEY SHADERS_API_KEY PRELINE_API_KEY PRELINE_MCP_TOKEN UNISON_TOKEN API_KEY_21ST
  SPRIXEN_API_KEY GAMELABS_API_KEY MCP_BEARER_TOKEN MOTION_API_KEY DAISYUI_BLUEPRINT_LICENSE DAISYUI_BLUEPRINT_EMAIL
)

# Load current credential file without echoing values.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Preserve any credentials already exported in the invoking shell by writing only missing entries.
# No secret values are printed.
python3 - "$ENV_FILE" "${vars[@]}" <<'PY'
import os,sys,re,tempfile
path=sys.argv[1]; names=sys.argv[2:]
lines=open(path).read().splitlines()
index={}
for i,line in enumerate(lines):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',line)
    if m:index[m.group(1)]=i
changed=[]
for name in names:
    val=os.environ.get(name,'')
    if not val: continue
    i=index.get(name)
    if i is None:
        lines.append(f'{name}={val}')
        index[name]=len(lines)-1
        changed.append(name)
    elif lines[i].split('=',1)[1]=='':
        lines[i]=f'{name}={val}'
        changed.append(name)
fd,tmp=tempfile.mkstemp(dir=os.path.dirname(path),prefix='.providers.',text=True)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(tmp,0o600); os.replace(tmp,path)
print(f'IMPORTED_FROM_CURRENT_SHELL={len(changed)}')
PY

# Safe alias normalization for names intentionally shared between MCP and API layers.
python3 - "$ENV_FILE" <<'PY'
import re,sys,tempfile,os
path=sys.argv[1]
lines=open(path).read().splitlines()
vals={}; pos={}
for i,l in enumerate(lines):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',l)
    if m: vals[m.group(1)]=m.group(2); pos[m.group(1)]=i
pairs=[('MOTION_SO_API_KEY','MOTION_API_KEY'),('PRELINE_API_KEY','PRELINE_MCP_TOKEN')]
changed=[]

def set_value(name,value):
    if name in pos:
        lines[pos[name]]=f'{name}={value}'
    else:
        pos[name]=len(lines)
        lines.append(f'{name}={value}')
    vals[name]=value

for a,b in pairs:
    av,bv=vals.get(a,''),vals.get(b,'')
    if av and not bv:
        set_value(b,av); changed.append(b)
    elif bv and not av:
        set_value(a,bv); changed.append(a)
fd,tmp=tempfile.mkstemp(dir=os.path.dirname(path),prefix='.providers.',text=True)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(tmp,0o600); os.replace(tmp,path)
print(f'ALIASES_NORMALIZED={len(changed)}')
PY

# Optional Vercel import: if the repo is linked and Vercel CLI is already authenticated,
# pull into a temporary file and copy only known provider variables whose local slot is empty.
if command -v vercel >/dev/null 2>&1 && [[ -f .vercel/project.json ]]; then
  tmpenv="$(mktemp)"
  if vercel env pull "$tmpenv" --yes >/dev/null 2>&1; then
    python3 - "$tmpenv" "$ENV_FILE" "${vars[@]}" <<'PY'
import os,sys,re,tempfile
src,dst=sys.argv[1],sys.argv[2]; names=set(sys.argv[3:])
raw=open(src).read().splitlines(); found={}
for l in raw:
    m=re.match(r'^(?:export\s+)?([A-Z0-9_]+)=(.*)$',l)
    if m and m.group(1) in names:
        v=m.group(2).strip()
        if len(v)>=2 and v[0]==v[-1] and v[0] in "\"'": v=v[1:-1]
        if v: found[m.group(1)]=v
lines=open(dst).read().splitlines(); pos={}
for i,l in enumerate(lines):
    m=re.match(r'^([A-Z0-9_]+)=(.*)$',l)
    if m:pos[m.group(1)]=i
changed=[]
for n,v in found.items():
    if n in pos:
        if lines[pos[n]].split('=',1)[1]=='':
            lines[pos[n]]=f'{n}={v}'; changed.append(n)
    else:
        lines.append(f'{n}={v}'); pos[n]=len(lines)-1; changed.append(n)
fd,tmp=tempfile.mkstemp(dir=os.path.dirname(dst),prefix='.providers.',text=True)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(tmp,0o600); os.replace(tmp,dst)
print(f'IMPORTED_FROM_VERCEL={len(changed)}')
PY
  else
    echo 'VERCEL_IMPORT=skipped (env pull unavailable or not authenticated)'
  fi
  rm -f "$tmpenv"
else
  echo 'VERCEL_IMPORT=skipped (repo not linked or vercel CLI unavailable)'
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

{
  echo '# Standalone credential consolidation'
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo '| Variable | Status |'
  echo '|---|---|'
  for n in "${vars[@]}"; do
    if [[ -n "${!n:-}" ]]; then echo "| $n | configured |"; else echo "| $n | missing |"; fi
  done
  echo
  echo 'No secret values are printed in this report.'
  echo 'Existing non-empty values are preserved.'
} > "$REPORT"

cat "$REPORT"
echo
echo "Saved report: $REPORT"
echo "Next: bash scripts/phase3-standalone-api-completion.sh"

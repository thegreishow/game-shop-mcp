#!/usr/bin/env bash
set -euo pipefail

# Read-only Phase 3 credential/configuration status. Never prints secret values.

vars=(
  AUTOSPRITE_API_KEY
  SPRITECOOK_API_KEY
  SPRITESHIP_API_KEY
  SPRITE_AI_API_KEY
  SPRITESHEET_AI_API_KEY
  AIMLAPI_API_KEY
  DEEPSEEK_API_KEY
  MESHY_API_KEY
  FAL_KEY
  REPLICATE_API_TOKEN
  ELEVENLABS_API_KEY
  SCENARIO_API_KEY
  SCENARIO_API_SECRET
  MANUS_API_KEY
  MOTION_SO_API_KEY
  MOTION_API_KEY
  LUDO_API_KEY
  PODIUM_API_KEY
  CLOUDINARY_URL
  ORIGINKIT_API_KEY
  SHADERS_API_KEY
  PRELINE_API_KEY
  PRELINE_MCP_TOKEN
  SPRIXEN_API_KEY
  GAMELABS_API_KEY
  UNISON_TOKEN
  API_KEY_21ST
  DAISYUI_BLUEPRINT_LICENSE
  DAISYUI_BLUEPRINT_EMAIL
  MCP_BEARER_TOKEN
)

printf '%-30s %s\n' 'VARIABLE' 'STATUS'
printf '%-30s %s\n' '------------------------------' '----------'
for name in "${vars[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    printf '%-30s %s\n' "$name" 'configured'
  else
    printf '%-30s %s\n' "$name" 'missing'
  fi
done

cat <<'EOF'

Notes:
- This is configuration status only. It does not perform billable generation.
- The Phase 3 batch performs safe reachability/auth checks where a read-only endpoint is known.
- Direct provider calls can incur provider-native costs outside Game Shop's spend lock.
EOF

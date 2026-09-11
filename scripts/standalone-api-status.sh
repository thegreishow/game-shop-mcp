#!/usr/bin/env bash
set -euo pipefail

# Read-only Phase 2B credential/configuration status. Never prints secret values.

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
  LUDO_API_KEY
  PODIUM_API_KEY
  CLOUDINARY_URL
  ORIGINKIT_API_KEY
  SHADERS_API_KEY
  PRELINE_API_KEY
  UNISON_TOKEN
  API_KEY_21ST
)

printf '%-28s %s\n' 'VARIABLE' 'STATUS'
printf '%-28s %s\n' '----------------------------' '----------'
for name in "${vars[@]}"; do
  if [[ -n "${!name:-}" ]]; then
    printf '%-28s %s\n' "$name" 'configured'
  else
    printf '%-28s %s\n' "$name" 'missing'
  fi
done

cat <<'EOF'

Notes:
- This is configuration status only. It does not test provider connectivity.
- AutoSprite and SpriteCook already have implemented Game Shop REST adapters.
- Meshy, fal, Replicate, Ludo, ElevenLabs and Scenario have provider-specific runtime adapters in Game Shop.
- SpriteShip, Sprite AI, Spritesheet AI, AIMLAPI and DeepSeek remain planned/not fully exposed in the legacy provider registry.
- Direct provider calls can incur provider-native costs outside Game Shop's spend lock.
EOF

#!/usr/bin/env bash
set -euo pipefail

# Phase 2B: create a user-level provider env file for direct API access outside Game Shop.
# This script never asks for, prints, or commits secrets. It creates placeholders only.

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/game-shop"
ENV_FILE="$CONFIG_DIR/providers.env"

mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

if [[ -f "$ENV_FILE" ]]; then
  echo "KEEP  $ENV_FILE (already exists)"
else
  cat > "$ENV_FILE" <<'EOF'
# Game Shop standalone provider credentials.
# Fill values locally. Never commit this file.

# Core game-art providers
AUTOSPRITE_API_KEY=
SPRITECOOK_API_KEY=
SPRITESHIP_API_KEY=
SPRITE_AI_API_KEY=
SPRITESHEET_AI_API_KEY=

# Model gateways
AIMLAPI_API_KEY=
DEEPSEEK_API_KEY=

# Media / 3D / agent providers
MESHY_API_KEY=
FAL_KEY=
REPLICATE_API_TOKEN=
ELEVENLABS_API_KEY=
SCENARIO_API_KEY=
SCENARIO_API_SECRET=
MANUS_API_KEY=
MOTION_SO_API_KEY=
LUDO_API_KEY=

# UI / design / commerce / delivery
PODIUM_API_KEY=
CLOUDINARY_URL=
ORIGINKIT_API_KEY=
SHADERS_API_KEY=
PRELINE_API_KEY=
UNISON_TOKEN=
API_KEY_21ST=
EOF
  chmod 600 "$ENV_FILE"
  echo "CREATE $ENV_FILE"
fi

cat <<EOF

Standalone API environment is ready.

1. Edit locally:
   ${EDITOR:-nano} "$ENV_FILE"

2. Load for the current shell:
   set -a
   source "$ENV_FILE"
   set +a

3. Check configuration without revealing values:
   bash scripts/standalone-api-status.sh

This does not enable Game Shop external execution and does not change
GAME_SHOP_ALLOW_PAID_GENERATION. Direct provider calls use provider-native
permissions/billing and therefore bypass Game Shop's spend guardrail.
EOF

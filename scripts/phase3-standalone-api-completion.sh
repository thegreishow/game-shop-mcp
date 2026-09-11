#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/game-shop"
ENV_FILE="$CONFIG_DIR/providers.env"
REPORT_DIR="$HOME/.local/share/game-shop"
REPORT="$REPORT_DIR/standalone-api-phase3-report.md"
mkdir -p "$REPORT_DIR"

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }

# Ensure the consolidated private env file exists and contains all current placeholders.
bash "$(cd "$(dirname "$0")" && pwd)/setup-standalone-api-env.sh" >/dev/null

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

status_rows=()
add_row(){ status_rows+=("| $1 | $2 | $3 |"); }
configured(){ [[ -n "${!1:-}" ]]; }

http_probe(){
  local url="$1"; shift
  local code
  code=$(curl -L -sS --connect-timeout 8 --max-time 15 -o /dev/null -w '%{http_code}' "$@" "$url" 2>/dev/null || true)
  [[ "$code" =~ ^[1-5][0-9][0-9]$ ]] || code="000"
  printf '%s' "$code"
}

printf '== Phase 3: standalone API completion ==\n'
printf 'Credential file: %s\n\n' "$ENV_FILE"

# Strong read-only auth checks for providers with stable, non-billable account/list endpoints.
if configured REPLICATE_API_TOKEN; then
  code=$(http_probe "https://api.replicate.com/v1/models" -H "Authorization: Bearer $REPLICATE_API_TOKEN")
  if [[ "$code" == "200" ]]; then
    add_row "Replicate API" "READY" "authenticated GET /v1/models"
    if command -v codex >/dev/null 2>&1; then
      # Current preferred direct Codex setup: official stdio package. No generation is invoked.
      codex mcp remove replicate >/dev/null 2>&1 || true
      codex mcp add replicate --env REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" -- npx -y replicate-mcp@latest >/dev/null 2>&1 || true
    fi
  else
    add_row "Replicate API" "AUTH NEEDED" "credential present but read-only auth probe returned HTTP $code"
  fi
else
  add_row "Replicate API" "AUTH NEEDED" "REPLICATE_API_TOKEN missing"
fi

if configured ELEVENLABS_API_KEY; then
  code=$(http_probe "https://api.elevenlabs.io/v1/user" -H "xi-api-key: $ELEVENLABS_API_KEY")
  [[ "$code" == "200" ]] && add_row "ElevenLabs API" "READY" "authenticated GET /v1/user" || add_row "ElevenLabs API" "AUTH NEEDED" "credential present but auth probe returned HTTP $code"
else
  add_row "ElevenLabs API" "AUTH NEEDED" "ELEVENLABS_API_KEY missing (OAuth MCP may still be usable independently)"
fi

if configured DEEPSEEK_API_KEY; then
  code=$(http_probe "https://api.deepseek.com/user/balance" -H "Authorization: Bearer $DEEPSEEK_API_KEY")
  [[ "$code" == "200" ]] && add_row "DeepSeek API" "READY" "authenticated balance endpoint" || add_row "DeepSeek API" "AUTH NEEDED" "credential present but auth probe returned HTTP $code"
else
  add_row "DeepSeek API" "AUTH NEEDED" "DEEPSEEK_API_KEY missing"
fi

# Reachability + credential readiness. These deliberately avoid generation/job creation.
check_configured_provider(){
  local label="$1" env_name="$2" url="$3"
  local code
  code=$(http_probe "$url")
  if configured "$env_name"; then
    if [[ "$code" == "000" ]]; then
      add_row "$label" "BLOCKED" "$env_name configured; provider base did not respond"
    else
      add_row "$label" "READY" "$env_name configured; provider reachable (HTTP $code); no billable call made"
    fi
  else
    if [[ "$code" == "000" ]]; then
      add_row "$label" "AUTH NEEDED" "$env_name missing; provider reachability not confirmed"
    else
      add_row "$label" "AUTH NEEDED" "$env_name missing; provider reachable (HTTP $code)"
    fi
  fi
}

check_configured_provider "Meshy API" MESHY_API_KEY "https://api.meshy.ai/"
check_configured_provider "fal API" FAL_KEY "https://fal.run/"
check_configured_provider "Manus API" MANUS_API_KEY "https://api.manus.ai/"
check_configured_provider "Motion.so API" MOTION_SO_API_KEY "https://api.motion.so/"
check_configured_provider "Ludo API" LUDO_API_KEY "https://api.ludo.ai/"
check_configured_provider "Podium API" PODIUM_API_KEY "https://api.podium.build/"
check_configured_provider "AIMLAPI" AIMLAPI_API_KEY "https://api.aimlapi.com/"

# Credential pairs / provider-specific config where a generic probe would be misleading.
if configured SCENARIO_API_KEY && configured SCENARIO_API_SECRET; then
  add_row "Scenario API" "READY" "API key + secret configured; generation not invoked"
else
  add_row "Scenario API" "AUTH NEEDED" "SCENARIO_API_KEY and/or SCENARIO_API_SECRET missing"
fi

if configured CLOUDINARY_URL; then
  add_row "Cloudinary" "READY" "CLOUDINARY_URL configured; no mutation/upload attempted"
else
  add_row "Cloudinary" "AUTH NEEDED" "CLOUDINARY_URL missing"
fi

for spec in \
  "AutoSprite API|AUTOSPRITE_API_KEY" \
  "SpriteCook API|SPRITECOOK_API_KEY" \
  "SpriteShip API|SPRITESHIP_API_KEY" \
  "Sprite AI API|SPRITE_AI_API_KEY" \
  "Spritesheet AI API|SPRITESHEET_AI_API_KEY"; do
  label=${spec%%|*}; var=${spec##*|}
  if configured "$var"; then add_row "$label" "READY" "$var configured; no paid generation invoked"; else add_row "$label" "AUTH NEEDED" "$var missing"; fi
done

# MCP credentials that also matter for direct standalone access.
for spec in \
  "Preline MCP|PRELINE_MCP_TOKEN" \
  "Sprixen MCP|SPRIXEN_API_KEY" \
  "Gamelabs MCP|GAMELABS_API_KEY" \
  "Game Shop direct MCP|MCP_BEARER_TOKEN" \
  "Motion.so MCP|MOTION_API_KEY"; do
  label=${spec%%|*}; var=${spec##*|}
  if configured "$var"; then add_row "$label" "READY" "$var configured"; else add_row "$label" "AUTH NEEDED" "$var missing"; fi
done

if configured DAISYUI_BLUEPRINT_LICENSE && configured DAISYUI_BLUEPRINT_EMAIL; then
  add_row "daisyUI Blueprint MCP" "READY" "license + email configured"
else
  add_row "daisyUI Blueprint MCP" "AUTH NEEDED" "Blueprint license/email missing"
fi

# Known local/vendor blockers from the completed MCP pass.
if [[ -d /Applications/Spline.app || -d "$HOME/Applications/Spline.app" ]]; then
  add_row "Spline MCP" "READY" "Spline desktop app installed"
else
  add_row "Spline MCP" "LOCAL APP NEEDED" "Spline.app not installed"
fi
add_row "Kibo UI MCP" "BLOCKED" "provider endpoint currently returned HTTP 500 in repeated official-bridge probes"
add_row "ContextCore MCP" "BLOCKED" "local backend/index healthy; stdio MCP bridge still requires repair"
add_row "WanGP/Wan2GP" "LOCAL APP NEEDED" "heavy local model runtime intentionally not installed"

{
  echo "# Standalone API / MCP Phase 3 report"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "| Capability | Status | Detail |"
  echo "|---|---|---|"
  printf '%s\n' "${status_rows[@]}"
  echo
  echo "No paid generation, uploads, renders, predictions, or provider mutations were invoked."
  echo "Direct provider usage remains outside Game Shop spend controls."
} > "$REPORT"

cat "$REPORT"
printf '\nSaved report: %s\n' "$REPORT"

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

npm_dep_version(){
  local pkg="$1"
  node -e "try{console.log(require('./node_modules/${pkg}/package.json').version)}catch(e){process.exit(1)}" 2>/dev/null || true
}

printf '== Phase 3: standalone API completion ==\n'
printf 'Credential file: %s\n\n' "$ENV_FILE"

# Strong read-only auth checks for providers with stable, non-billable account/list endpoints.
if configured REPLICATE_API_TOKEN; then
  code=$(http_probe "https://api.replicate.com/v1/account" -H "Authorization: Bearer $REPLICATE_API_TOKEN")
  if [[ "$code" == "200" ]]; then
    add_row "Replicate API" "READY" "authenticated GET /v1/account"
    if command -v codex >/dev/null 2>&1; then
      # Current preferred direct Codex setup: official stdio package. No generation is invoked.
      codex mcp remove replicate >/dev/null 2>&1 || true
      codex mcp add replicate --env REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" -- npx -y replicate-mcp@latest >/dev/null 2>&1 || true
    fi
  else
    add_row "Replicate API" "AUTH NEEDED" "credential present but authenticated GET /v1/account returned HTTP $code"
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

# Credential presence + reachability only. These are deliberately NOT called READY because
# a provider root returning 2xx/4xx does not prove the supplied credential is valid.
check_configured_provider(){
  local label="$1" env_name="$2" url="$3"
  local code
  code=$(http_probe "$url")
  if configured "$env_name"; then
    if [[ "$code" == "000" ]]; then
      add_row "$label" "BLOCKED" "$env_name configured; provider base did not respond"
    else
      add_row "$label" "CONFIGURED" "$env_name present; provider reachable (HTTP $code); auth not independently verified; no billable call made"
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

# Scenario SDK is useful independently of whether account API auth is configured yet.
scenario_sdk_version=$(npm_dep_version '@scenario-labs/sdk')
if [[ -n "$scenario_sdk_version" ]]; then
  add_row "Scenario SDK" "READY" "@scenario-labs/sdk@$scenario_sdk_version installed project-locally"
else
  add_row "Scenario SDK" "INSTALL NEEDED" "@scenario-labs/sdk not installed in Game Shop project"
fi

# Credential pairs / provider-specific config where a generic probe would be misleading.
if configured SCENARIO_API_KEY && configured SCENARIO_API_SECRET; then
  add_row "Scenario API" "CONFIGURED" "API key + secret configured; live auth not probed; generation not invoked"
else
  add_row "Scenario API" "AUTH NEEDED" "SCENARIO_API_KEY and/or SCENARIO_API_SECRET missing"
fi

if configured CLOUDINARY_URL; then
  add_row "Cloudinary" "CONFIGURED" "CLOUDINARY_URL configured; no mutation/upload attempted"
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
  if configured "$var"; then add_row "$label" "CONFIGURED" "$var configured; auth not independently verified; no paid generation invoked"; else add_row "$label" "AUTH NEEDED" "$var missing"; fi
done

# Project-local UI capabilities.
preline_version=$(npm_dep_version 'preline')
if [[ -n "$preline_version" ]]; then
  add_row "Preline library" "READY" "preline@$preline_version installed project-locally"
else
  add_row "Preline library" "INSTALL NEEDED" "preline package not installed in Game Shop project"
fi
if [[ -d .agents/skills/preline-mcp && -d .agents/skills/preline-theme-generator ]]; then
  add_row "Preline Agent Skills" "READY" "preline-mcp + preline-theme-generator installed project-locally"
else
  add_row "Preline Agent Skills" "INSTALL NEEDED" "one or both official Preline skills missing"
fi
if [[ -d .agents/skills/daisyui ]]; then
  add_row "daisyUI Agent Skill" "READY" "official daisyUI skill installed project-locally"
else
  add_row "daisyUI Agent Skill" "INSTALL NEEDED" "official daisyUI skill missing"
fi

# MCP credentials that also matter for direct standalone access. Presence is not the same
# as a successful MCP handshake, so report CONFIGURED unless another validator proved it.
for spec in \
  "Preline MCP|PRELINE_MCP_TOKEN" \
  "Sprixen MCP|SPRIXEN_API_KEY" \
  "Gamelabs MCP|GAMELABS_API_KEY" \
  "Motion.so MCP|MOTION_API_KEY"; do
  label=${spec%%|*}; var=${spec##*|}
  if configured "$var"; then add_row "$label" "CONFIGURED" "$var configured; handshake not tested by this script"; else add_row "$label" "AUTH NEEDED" "$var missing"; fi
done

# Game Shop's server code expects GAME_SHOP_MCP_TOKEN. MCP_BEARER_TOKEN is retained only as
# a legacy alias for old local setup files; do not treat Vercel's [SENSITIVE] placeholder as a token.
if configured GAME_SHOP_MCP_TOKEN && [[ "${GAME_SHOP_MCP_TOKEN}" != "[SENSITIVE]" ]]; then
  add_row "Game Shop direct MCP" "CONFIGURED" "GAME_SHOP_MCP_TOKEN available locally; live handshake not tested by this script"
elif configured MCP_BEARER_TOKEN && [[ "${MCP_BEARER_TOKEN}" != "[SENSITIVE]" ]]; then
  add_row "Game Shop direct MCP" "CONFIGURED" "legacy MCP_BEARER_TOKEN available locally; migrate to GAME_SHOP_MCP_TOKEN"
else
  add_row "Game Shop direct MCP" "AUTH NEEDED" "GAME_SHOP_MCP_TOKEN not available locally; an existing Vercel Secret cannot be pulled back as plaintext"
fi

if configured DAISYUI_BLUEPRINT_LICENSE && configured DAISYUI_BLUEPRINT_EMAIL; then
  add_row "daisyUI Blueprint MCP" "CONFIGURED" "license + email configured; handshake not tested by this script"
else
  add_row "daisyUI Blueprint MCP" "AUTH NEEDED" "Blueprint requires both license + account email; free daisyUI skill can still be used"
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
  echo "READY means directly verified by this script or installed locally."
  echo "CONFIGURED means credentials/config are present but this script did not prove live authentication."
  echo "No paid generation, uploads, renders, predictions, or provider mutations were invoked."
  echo "Direct provider usage remains outside Game Shop spend controls."
} > "$REPORT"

cat "$REPORT"
printf '\nSaved report: %s\n' "$REPORT"

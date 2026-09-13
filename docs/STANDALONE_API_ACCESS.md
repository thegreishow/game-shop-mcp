# Game Shop Phase 2B — Standalone API Access

Phase 2B gives the same provider credentials a clean user-level home so Codex, shell scripts, local tools, and Game Shop can use providers independently without pretending ordinary REST APIs are MCP servers.

## Architecture

Two valid paths remain in parallel:

1. `client -> Game Shop MCP -> provider` — routed/orchestrated path with Game Shop project context, artifacts, QA and spend controls.
2. `client/local tool -> provider API directly` — standalone path using provider-native auth, permissions and billing.

Direct provider calls **do not inherit Game Shop's spend guardrail**. The Game Shop flags `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS` and `GAME_SHOP_ALLOW_PAID_GENERATION` govern Game Shop itself, not arbitrary direct calls made by Codex/curl/other clients.

## Local credential file

Run:

```bash
bash scripts/setup-standalone-api-env.sh
```

This creates:

```text
~/.config/game-shop/providers.env
```

with mode `600` and placeholder values only. The script never writes real credentials into git.

Load it for the current terminal session:

```bash
set -a
source ~/.config/game-shop/providers.env
set +a
```

Then check which variables are configured without printing values:

```bash
bash scripts/standalone-api-status.sh
```

## Provider map

### Implemented/verified provider-side access in the Game Shop codebase

| Provider | Variable | Current direct surface |
|---|---|---|
| AutoSprite | `AUTOSPRITE_API_KEY` | REST; Game Shop currently calls `https://www.autosprite.io/api/v1/...` with `x-api-key`. |
| SpriteCook | `SPRITECOOK_API_KEY` | REST; Game Shop currently calls `https://api.spritecook.ai/v1/api/...` with Bearer auth. |
| Meshy | `MESHY_API_KEY` | REST; Game Shop uses the `api.meshy.ai/openapi/v2` surface with Bearer auth. |
| fal | `FAL_KEY` | Queue REST/API; Game Shop uses `https://queue.fal.run/...` with `Authorization: Key ...`. |
| Replicate | `REPLICATE_API_TOKEN` | REST + MCP; Game Shop uses `https://api.replicate.com/v1/predictions` with Token auth. |
| Ludo AI | `LUDO_API_KEY` | Remote MCP + REST docs; Ludo uses `ApiKey` semantics rather than normal Bearer OAuth. |
| ElevenLabs | `ELEVENLABS_API_KEY` | REST + MCP; Game Shop API adapter uses `xi-api-key`; Codex MCP is separately OAuth-authenticated. |
| Scenario | `SCENARIO_API_KEY` | REST/OpenAPI; Game Shop currently calls `https://api.cloud.scenario.com/v1/...` with Bearer auth. |
| Motion.so | `MOTION_SO_API_KEY` | REST + MCP. MCP auth has a separate client/device-flow compatibility issue; API access is independent. |
| Manus | `MANUS_API_KEY` | API v2 + official skill. |
| Podium | `PODIUM_API_KEY` | REST API at the endpoint recorded in the integration registry. |
| Cloudinary | `CLOUDINARY_URL` | Direct asset API/CLI configuration. |
| OriginKit | `ORIGINKIT_API_KEY` | Hosted MCP + registry API. Codex MCP may use OAuth independently of this key. |
| Shaders | `SHADERS_API_KEY` | Hosted MCP + JavaScript/registry API. Codex MCP may use OAuth independently of this key. |

### Present in Game Shop but not yet fully exposed

The following variables exist because the providers are part of the Game Shop plan, but their legacy provider records still mark the adapter/tool layer as planned or incomplete:

- `SPRITESHIP_API_KEY`
- `SPRITE_AI_API_KEY`
- `SPRITESHEET_AI_API_KEY`
- `AIMLAPI_API_KEY`
- `DEEPSEEK_API_KEY`

Do not invent endpoints or command contracts for these. Promote them only after the official API contract is pinned and the adapter is implemented.

## What Phase 2B does not do

It does not:

- copy secrets from Vercel/GitHub/ChatGPT into a local file;
- enable paid generation;
- make every API appear in `codex mcp list`;
- create fake MCP wrappers around REST APIs;
- test billable generation endpoints automatically.

## Next Phase 2B steps

1. Run the local env bootstrap and status checker.
2. Populate only credentials you already own and intend to use directly.
3. Add safe read-only connectivity tests for providers that expose non-billable status/model/account endpoints.
4. Promote SpriteShip, Sprite AI, Spritesheet AI, AIMLAPI and DeepSeek only after their exact official contracts are verified.
5. Keep Game Shop as the preferred route when project context, artifact capture, QA, orchestration, or spend governance matters.

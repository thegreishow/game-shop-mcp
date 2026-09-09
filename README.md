# Game Shop MCP

Shared remote MCP gateway for The Game Shop AI game-development stack.

The goal is simple: connect one public MCP endpoint to ChatGPT, Grok, Codex, Cursor, Claude, and other MCP clients, while keeping vendor API keys on the server.

## Spend lock

**Paid generation is off by default.** The gateway will not call provider endpoints that create new jobs or consume credits.

Blocked unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`:

- `gameshop_generate_character`
- `gameshop_generate_animation`
- `gameshop_spritecook_generate`

Still allowed (lookup / status only):

- `gameshop_list_providers`
- `gameshop_spend_policy`
- `gameshop_capability_catalog`
- `gameshop_generation_status`
- `gameshop_get_spritesheet`
- `gameshop_spritecook_models`
- `gameshop_spritecook_status`

Leave the paid flag unset in Vercel. Any other value than exactly `true` keeps money blocked. The check lives in `src/spend.ts` and is enforced inside the provider functions, so a new tool cannot spend by forgetting a UI annotation.

## Architecture

```text
ChatGPT / Grok / Codex / Cursor / Claude
                  |
                  v
        Game Shop MCP Gateway
                  |
      +-----------+------------+-------------+-----------+
      |           |            |             |           |
 SpriteShip   AutoSprite   Sprite AI      AIMLAPI    DeepSeek
```

The gateway never returns provider API keys to MCP clients.

## v0.1 tools

- `gameshop_list_providers` — shows which back-end providers are configured, plus the spend lock.
- `gameshop_spend_policy` — reports whether paid generation is blocked.
- `gameshop_capability_catalog` — React Bits, Anime.js, game-art providers and model gateways.
- `gameshop_generate_character` — AutoSprite character. Paid; blocked by default.
- `gameshop_generate_animation` — AutoSprite sprite-sheet animations. Paid; blocked by default.
- `gameshop_generation_status` — polls an AutoSprite job.
- `gameshop_get_spritesheet` — sprite-sheet metadata and temporary download URLs.
- `gameshop_spritecook_models` — list SpriteCook models.
- `gameshop_spritecook_generate` — SpriteCook art job. Paid; blocked by default.
- `gameshop_spritecook_status` — polls a SpriteCook job.

SpriteShip, Sprite AI, AIMLAPI, and DeepSeek are registered in the provider layer now and will receive dedicated tools next. Those tools must use the same spend lock.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with the provider keys only if you need status/lookup against an existing account. Never commit it. Do not set `GAME_SHOP_ALLOW_PAID_GENERATION` unless you intend to spend credits.

Run locally with Vercel:

```bash
npx vercel dev
```

The MCP endpoint is:

```text
http://localhost:3000/mcp
```

## Environment variables

```text
SPRITESHIP_API_KEY
AUTOSPRITE_API_KEY
SPRITE_AI_API_KEY
SPRITECOOK_API_KEY
AIMLAPI_API_KEY
DEEPSEEK_API_KEY
GAME_SHOP_MCP_TOKEN              # reserved for gateway-level auth
GAME_SHOP_ALLOW_PAID_GENERATION  # must be exactly "true" to spend money; leave unset
```

## Deploy to Vercel

Import this GitHub repo as a Vercel project, add the environment variables in Vercel Project Settings, then deploy.

Do **not** add `GAME_SHOP_ALLOW_PAID_GENERATION=true` on the deployment if you want the shop to stay free.

The public MCP endpoint will be:

```text
https://YOUR-DEPLOYMENT.vercel.app/mcp
```

A custom domain can later make this something like:

```text
https://mcp.thegreishow.com/mcp
```

## Connect clients

### Codex

```toml
[mcp_servers.game-shop]
url = "https://YOUR-DEPLOYMENT.vercel.app/mcp"
```

### Generic MCP client

```json
{
  "game-shop": {
    "url": "https://YOUR-DEPLOYMENT.vercel.app/mcp"
  }
}
```

ChatGPT and Grok can both be pointed at the same remote MCP URL once deployed and publicly reachable.

## Safety / spend rules

- Default mode is free-only. Generation tools must not be retried after they report the spend lock.
- Read-only tools may talk to providers for status and catalogs. They must not create jobs.
- Do not place live provider keys in source files, commits, issues, logs, screenshots, or MCP responses.
- Future paid adapters (SpriteShip, Sprite AI, AIMLAPI, DeepSeek) must call `assertPaidGenerationAllowed()` before any POST that can bill.

## Next milestones

1. Deploy the remote MCP endpoint.
2. Add gateway authentication.
3. Add SpriteShip-native generation tools behind the spend lock.
4. Add Sprite AI asset tools behind the spend lock.
5. Add AIMLAPI image/video/audio routing behind the spend lock.
6. Add DeepSeek code/reasoning tools behind the spend lock.
7. Add GitHub asset-sync tools for The Game Shop games.
8. Keep paid generation off unless a human explicitly opts in.

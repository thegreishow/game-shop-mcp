# Game Shop MCP

Shared remote MCP gateway for The Game Shop AI game-development stack.

The goal is simple: connect one public MCP endpoint to ChatGPT, Grok, Codex, Cursor, Claude, and other MCP clients, while keeping vendor API keys on the server.

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

- `gameshop_list_providers` — shows which back-end providers are configured.
- `gameshop_generate_character` — creates an AutoSprite character from a prompt.
- `gameshop_generate_animation` — generates AutoSprite sprite-sheet animations.
- `gameshop_generation_status` — polls an AutoSprite job.
- `gameshop_get_spritesheet` — returns sprite-sheet metadata and temporary download URLs.

SpriteShip, Sprite AI, AIMLAPI, and DeepSeek are registered in the provider layer now and will receive dedicated tools next.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with the provider keys. Never commit it.

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
AIMLAPI_API_KEY
DEEPSEEK_API_KEY
GAME_SHOP_MCP_TOKEN   # reserved for gateway-level auth
```

## Deploy to Vercel

Import this GitHub repo as a Vercel project, add the environment variables in Vercel Project Settings, then deploy.

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

Generation tools may consume provider credits. Read-only tools are marked as such. Generation tools are non-idempotent and should not be retried blindly after timeouts.

Do not place live provider keys in source files, commits, issues, logs, screenshots, or MCP responses.

## Next milestones

1. Deploy the remote MCP endpoint.
2. Add gateway authentication.
3. Add SpriteShip-native generation tools.
4. Add Sprite AI asset tools.
5. Add AIMLAPI image/video/audio routing.
6. Add DeepSeek code/reasoning tools.
7. Add GitHub asset-sync tools for The Game Shop games.
8. Add a spend-preview / credit-budget layer before paid generation.

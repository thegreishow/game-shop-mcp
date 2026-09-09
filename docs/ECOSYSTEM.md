# Game Shop MCP — Capability Fabric

Game Shop MCP is a private orchestration layer for building games, websites, apps, interactive experiences and other digital products. Clients such as ChatGPT, Grok, Codex, Cursor and Claude should ask Game Shop for capabilities; Game Shop decides which provider or library should do the work.

## Spend policy

Default operating mode is **free-only**.

- Do not call vendor endpoints that create jobs or consume credits.
- Paid tools exist so the interface can be designed and tested, but they must refuse unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`.
- The lock is enforced in `src/spend.ts` and at each paid provider function, not only in tool descriptions.
- Status, catalog, and model-list tools are allowed because they do not start billed generations.

## Current foundation

### Game art and animation
- SpriteShip — broad game-asset generation and engine exports
- AutoSprite — consistent character creation and animation
- Sprite AI — pixel-art generation, animation, restyling and utility maps
- Spritesheet AI — aligned multi-animation spritesheets and engine exports (adapter staged; endpoint contract still to be verified before paid calls)
- SpriteCook — game art, characters, animation, tilesets, UI, textures and background removal

### UI and motion
- React Bits — free MIT React component library; use the official `@react-bits` shadcn registry or copy workflow in the target project
- React Bits Pro — licensed registries `@reactbits-starter` and `@reactbits-pro`; install directly from the official registry in licensed target projects. Do not mirror or proxy Pro source through Game Shop MCP.
- Anime.js — preferred lightweight general-purpose JS animation engine for DOM, CSS, SVG, JS-object animation, timelines, draggable/scroll interactions and React scopes

### Model and reasoning gateways
- AIMLAPI
- DeepSeek

## Strong candidates to evaluate next

### Game assets / media
- Ludo AI — remote MCP covering sprites, animations, 3D models, UI, music, sound effects, voices and video
- Sprixen — REST + MCP, style-locked sprites, tiles and music with webhook delivery
- Gamelabs Studio — MCP pipeline for image generation, video animation, spritesheet extraction and project management
- AI Spritesheet Maker — artifact-first MCP with project-scoped asset libraries, lineage, extraction and runtime atlas metadata
- Spritesheet Forge — MCP image-processing utility for packing, splitting, trimming, GIF/WebP conversion and atlas generation
- Scenario — style-consistent game art and custom model workflows
- Meshy — 3D generation, texturing, rigging and game-ready GLB workflows

### Front-end / interactive production
- Motion — React animation and interaction layer
- GSAP — high-control timelines and animation systems
- Three.js + React Three Fiber — 3D scenes and WebGL experiences
- PixiJS — GPU-accelerated 2D rendering and interactive experiences
- Theatre.js — authored animation/timeline tooling for 3D and interactive scenes

### Product infrastructure
- GitHub — source, PRs and releases
- Vercel — deploys, previews and runtime observability
- Supabase — database, auth, storage and edge functions
- Stripe — payments and product monetization
- Resend — transactional email and campaigns
- Expo — mobile and React Native production

## Design rule

Do not turn Game Shop into a pile of raw vendor endpoints. Expose capability-oriented tools such as:

- `build_premium_game_menu`
- `generate_character`
- `generate_animation`
- `generate_game_asset`
- `compose_interaction`
- `build_3d_scene`
- `test_mobile_controls`
- `deploy_preview`
- `create_payment_flow`

Provider-specific tools are useful while integrations mature, but the long-term interface should route by capability, budget, style consistency, speed and target engine.

Paid capability tools must keep the same spend lock. A capability name is not permission to bill.

## Security

- Never commit provider API keys or license keys.
- Public Game Shop MCP deployments should require `GAME_SHOP_MCP_TOKEN`.
- Keep paid-generation tools clearly annotated as non-idempotent and credit-consuming.
- Prefer read-only discovery before generation.
- Do not enable `GAME_SHOP_ALLOW_PAID_GENERATION` on public or shared deployments.

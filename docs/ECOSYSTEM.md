# Game Shop MCP — Capability Fabric

Game Shop MCP is a private orchestration layer for building games, websites, apps, interactive experiences and other digital products. Clients such as ChatGPT, Grok, Codex, Cursor and Claude should ask Game Shop for capabilities; Game Shop decides which provider, library or workflow should do the work.

## Spend policy

Default operating mode is **free-only**.

- Do not call vendor endpoints that create jobs or consume credits.
- Paid tools exist so the interface can be designed and tested, but they must refuse unless `GAME_SHOP_ALLOW_PAID_GENERATION=true`.
- The lock is enforced in `src/spend.ts` and at each paid provider function, not only in tool descriptions.
- Status, catalog, and model-list tools are allowed because they do not start billed generations.

## Integration classes

Every ecosystem entry should be treated as one of these classes before deeper integration:

- **library** — install/use inside a target project
- **component-registry** — discover/install source components into target projects
- **design-reference** — inspiration, pattern discovery, style benchmarking; do not scrape proprietary work into the repo
- **platform/API** — connect only when a stable public API/MCP and credentials are available
- **agent/tool** — external AI product that may orchestrate or create assets/projects
- **runtime/standard** — browser/runtime capability such as WebGPU
- **research/watchlist** — candidate whose integration contract, license or product identity still needs verification

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
- Anime.js — lightweight general-purpose JS animation engine for DOM, CSS, SVG, JS-object animation and timelines
- Motion — production animation layer for React, JavaScript and Vue; strong for gestures, layout animation, scroll, springs and agent-assisted workflows
- GSAP — high-control timelines, ScrollTrigger and cinematic choreography
- Lenis — lightweight smooth-scroll engine; useful for WebGL/DOM synchronization and premium scroll behavior

### 3D / GPU / shaders
- Three.js — core browser 3D/WebGL runtime
- Spline — collaborative 2D/3D interactive design platform with web/mobile publishing and AI-assisted editing
- WebGPU — modern browser GPU API for advanced graphics and compute
- ShaderGradient — candidate for reusable shader-driven gradient experiences
- Shaders.com — shader discovery/reference source
- liquid-glass-js — GitHub library candidate for liquid-glass visual effects

### Model and reasoning gateways
- AIMLAPI
- DeepSeek

## Expanded design + motion ecosystem

### Open-source / installable UI and component systems
Prioritize direct package/registry integration where licensing permits.

- KokonutUI — React + Tailwind + Motion, shadcn-compatible registry, agent-friendly component discovery
- Magic UI
- daisyUI
- HeroUI
- Motion Primitives
- Animate UI
- Cult UI
- Preline UI
- Headless UI
- Kibo UI
- shadcn/ui
- Skiper UI
- Origin UI / OriginKit
- SmoothUI
- UI Unlumen
- Vengeance UI — research/watchlist until canonical project and license are verified
- Animaster LIB — research/watchlist until canonical project and license are verified
- vibify.club — research/watchlist
- compoentry.dev — component discovery/reference candidate

### Motion / animation / interactive production
- Motion.dev — primary React/JS/Vue motion engine and AI-aware motion tooling
- Anime.js — lightweight choreography and object/SVG/DOM animation
- GSAP — premium timeline/scroll choreography
- Lenis — smooth scrolling and WebGL/DOM scroll synchronization
- Rive — interactive vector animation/state-machine runtime and design platform
- Jitter — browser motion-design/video production
- Raylight — browser product-motion/video production
- Animos — browser motion templates and MP4/WebM export
- AutoAE — research/watchlist for automated After Effects-style workflows
- MotionSites AI — research/watchlist for AI-generated motion websites
- Motion.so — research/watchlist; verify canonical product before integration

### 3D / spatial / visual effects
- Three.js
- Spline
- WebGPU
- ShaderGradient
- liquid-glass-js
- Shaders.com
- is.graphics — visual/graphics reference candidate
- Liquid Logo — research/watchlist until canonical project is verified

### Design systems / inspiration / quality references
Treat these primarily as inspiration and evaluation sources unless they expose a permitted API/registry.

- Godly.website — premium web-design inspiration/reference
- 21st.dev — component/AI design ecosystem candidate
- impeccable.style — visual-quality/reference candidate
- awesome-design — curated design-resource candidate
- gitdesign.MD — research/watchlist; verify canonical project
- skeudesign.com — skeuomorphic design reference
- bklit.com — research/watchlist; verify exact product/capability
- contextcore.xyz — research/watchlist
- HorizonX.so — research/watchlist
- Unison Studio — design/creative production candidate

### AI creation / agent platforms
Connect only when there is a clear API/MCP/automation contract and licensing permits it.

- Manus — general AI agent platform with website, design and game-building capabilities
- 21st.dev — AI/component design workflows
- LogoAI — logo/brand generation platform candidate
- Chatterbox AI — research/watchlist; disambiguate exact product before integration
- Podium.global — research/watchlist; verify exact product/capability
- Wan2GP — research/watchlist; likely Wan-video generation tooling, verify canonical repo and runtime contract

### Learning / standards / reference
- The Odin Project — web-development learning/reference resource, not a runtime dependency
- WebGPU documentation/spec ecosystem — graphics/compute reference
- Godly / impeccable.style / awesome-design — design benchmarking and inspiration only

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
- React Three Fiber — React scene composition for Three.js
- PixiJS — GPU-accelerated 2D rendering and interactive experiences
- Theatre.js — authored animation/timeline tooling for 3D and interactive scenes
- Rive runtime/state machines
- Spline embeds/runtime
- Motion AI Kit / Motion UI where licensing permits

### Product infrastructure
- GitHub — source, PRs and releases
- Vercel — deploys, previews and runtime observability
- Supabase — database, auth, storage and edge functions
- Stripe — payments and product monetization
- Resend — transactional email and campaigns
- Expo — mobile and React Native production

## Capability families Game Shop should expose

### UI composition
- `build_component`
- `build_premium_section`
- `build_navigation`
- `build_dashboard`
- `build_game_hud`
- `build_game_menu`

### Motion
- `compose_interaction`
- `animate_component`
- `build_scroll_sequence`
- `build_timeline`
- `build_transition_system`
- `build_microinteractions`

### 3D / GPU
- `build_3d_scene`
- `build_webgl_effect`
- `build_shader_effect`
- `build_interactive_product_scene`

### Game art
- `generate_character`
- `generate_animation`
- `generate_game_asset`
- `generate_spritesheet`
- `generate_tileset`
- `remove_background`

### Quality and discovery
- `find_design_reference`
- `recommend_ui_engine`
- `recommend_motion_engine`
- `audit_visual_quality`
- `audit_motion_performance`

### Product delivery
- `test_mobile_controls`
- `deploy_preview`
- `create_payment_flow`
- `create_backend_feature`

## Routing principles

Do not turn Game Shop into a pile of raw vendor endpoints. Provider-specific tools are useful while integrations mature, but the long-term interface routes by capability.

Routing should consider:

- target stack (React, vanilla JS, Vue, Phaser, Three.js, Expo, etc.)
- requested visual style
- motion complexity
- runtime performance budget
- bundle-size constraints
- accessibility
- mobile behavior
- whether source ownership is required
- licensing
- API/configuration availability
- cost / credit spend
- quality vs speed preference
- whether a simple native/CSS solution is better than a dependency

Examples:

- simple hover/fade -> CSS
- React gesture/layout work -> Motion
- lightweight DOM/SVG choreography -> Anime.js
- cinematic timeline/ScrollTrigger -> GSAP
- smooth scroll + WebGL synchronization -> Lenis
- reusable agent-installable component -> shadcn-compatible registries such as React Bits or KokonutUI
- interactive 3D scene -> Three.js / React Three Fiber / Spline depending ownership and runtime needs
- advanced shader/GPU effect -> Three.js/WebGPU/shader tooling

## Repository policy for external ecosystems

"Get it in the repo" means **catalog, adapters, install recipes, routing knowledge, licenses and capability metadata** — not copying entire third-party codebases indiscriminately.

- Never vendor proprietary or source-available-but-nonredistributable libraries without explicit permission.
- Prefer official npm packages, package managers and component registries.
- For MIT/open-source source-copy component systems, install into target projects when needed rather than mirroring everything into Game Shop.
- Design galleries such as Godly should be used as reference/inspiration, not scraped as reusable source.
- External AI products should remain platform connectors unless they explicitly permit code/model redistribution.
- Record canonical URLs and licenses before moving an item from `research/watchlist` to `integrated`.

## Security

- Never commit provider API keys or license keys.
- Public Game Shop MCP deployments should require `GAME_SHOP_MCP_TOKEN`.
- Keep paid-generation tools clearly annotated as non-idempotent and credit-consuming.
- Prefer read-only discovery before generation.
- Do not enable `GAME_SHOP_ALLOW_PAID_GENERATION` on public or shared deployments.

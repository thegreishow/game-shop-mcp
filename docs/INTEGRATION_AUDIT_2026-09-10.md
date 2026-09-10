# Game Shop Integration Audit — 2026-09-10

This audit separates the Game Shop **orchestration layer** from the integrations it can expose or consume directly. The goal is dual-path access wherever the vendor contract permits it:

1. `client -> Game Shop MCP -> provider/integration` (orchestrated path)
2. `client -> provider MCP/API/CLI/library directly` (standalone path)

Classification tags used here:

- **DIRECT MCP** — remote or stdio MCP that can be connected directly to a compatible client.
- **API** — verified programmable HTTP/API surface.
- **LOCAL MCP** — MCP requires a workstation, local runtime, or desktop application.
- **CLI** — installable command-line/agent-skill surface.
- **REGISTRY** — component/artifact registry consumed by shadcn or a vendor CLI.
- **LIBRARY** — project/runtime dependency; should not be made into a fake MCP.
- **NEEDS AUTH** — requires OAuth, API key, license, service account, or partner approval.
- **NOT YET WIRED** — catalogued, planned, research-only, or missing a verified standalone contract/adapter.

## A. Canonical integration registry (`src/integrations.ts`)

| Integration | Classification | Standalone disposition |
|---|---|---|
| Magic UI | DIRECT MCP / CLI / REGISTRY | Global stdio MCP is appropriate. |
| Kibo UI | DIRECT MCP / CLI / REGISTRY | MCP support is verified, but the exact Codex launch contract should be pinned before automatic global install. |
| HeroUI | DIRECT MCP / CLI / LIBRARY | Global React and Native stdio MCPs are appropriate. |
| Impeccable | CLI | Install as an agent/design CLI; do not invent an MCP endpoint. |
| Podium | API / NEEDS AUTH | Direct REST use is valid with `PODIUM_API_KEY`. |
| Skiper UI | CLI / REGISTRY / NEEDS AUTH for Pro | Use registry/CLI in target projects; Pro license must stay local. |
| SmoothUI | REGISTRY | Project-side registry/reference only; no verified standalone MCP/API. |
| Unlumen UI | REGISTRY | Project-side registry/reference only; licensed Pro source must not be mirrored. |
| HorizonX | NOT YET WIRED | Reference/commercial asset source; no verified programmable API/MCP. |
| Vengeance UI | CLI / REGISTRY | Project-side install path; exact component commands are selected from vendor docs. |
| Chatterbox TTS | CLI / LIBRARY | Local TTS runtime; not a remote MCP. |
| 21st.dev | DIRECT MCP / CLI / REGISTRY / NEEDS AUTH | Hosted MCP + CLI; direct client access supported. |
| Motion AI Kit | DIRECT MCP / CLI / LIBRARY | Use its official installer; it owns the hosted MCP wiring. |
| Mosaic Motion (`motion.so`) | DIRECT MCP / API / NEEDS AUTH | MCP endpoint is valid. Generic agents use OAuth 2.1 device flow; Codex browser-redirect login is currently incompatible. REST/API fallback remains separate. |
| Spline MCP Server | LOCAL MCP / API | Requires open Spline desktop app; direct workstation use only. |
| Raylight MCP | DIRECT MCP / NEEDS AUTH | Remote OAuth MCP; keep a Raylight project open when required. |
| Manus API v2 | API / CLI / NEEDS AUTH | Direct API + official Codex skill. |
| Manus Custom MCP | DIRECT MCP | This describes exposing Game Shop into Manus; it is not a separate provider server to add to Codex. |
| Rive Web Runtime | API / LIBRARY | Project/runtime capability; install into target projects. |
| Ludo AI | DIRECT MCP / API / NEEDS AUTH | Remote MCP uses `ApiKey` auth rather than ordinary OAuth/Bearer semantics; direct clients need custom header support. |
| Meshy | DIRECT MCP / API / CLI / NEEDS AUTH | REST is verified; registry currently stores API base, not a pinned standalone MCP URL. Do not invent the MCP URL. |
| fal | DIRECT MCP / API / CLI / NEEDS AUTH | Hosted MCP + queue API. Current Codex OAuth discovery is not sufficient; API-key path remains valid. |
| Replicate | DIRECT MCP / API / CLI / NEEDS AUTH | Hosted MCP is directly usable; OAuth path is supported. |
| ElevenLabs | DIRECT MCP / API / NEEDS AUTH | Hosted MCP + API. Current registry endpoint needs regional correction for the user's Codex flow (`api.us.elevenlabs.io` was advertised by metadata). |
| Scenario | API / NEEDS AUTH | Direct REST/OpenAPI integration. |
| Cloudinary | API / CLI / NEEDS AUTH | Direct asset API/CLI. |
| MotionSites AI MCP | DIRECT MCP / NEEDS AUTH | Hosted remote MCP; OAuth supported. |
| Unison Brain | DIRECT MCP / API / CLI / NEEDS AUTH | Global stdio MCP is appropriate; token still required for service use. |
| ContextCore | LOCAL MCP / CLI | Local index/backend + stdio MCP. Workstation install only. |
| WanGP / Wan2GP | LOCAL MCP / API / CLI | Local model/runtime; supports stdio or Streamable HTTP once running. |
| ShaderGradient | LIBRARY | Install into a target project. |
| KokonutUI | DIRECT MCP / CLI / REGISTRY | Consume through the single global shadcn MCP and project registry config; do not spawn duplicate MCPs. |
| Bklit UI | CLI / REGISTRY | Consume through shadcn registry/skill. |
| Cult UI | DIRECT MCP / CLI / REGISTRY | Consume through shadcn MCP; do not mirror Pro content. |
| Animate UI | DIRECT MCP / CLI / REGISTRY | Consume through shadcn MCP. |
| Preline UI MCP | DIRECT MCP / CLI / REGISTRY / NEEDS AUTH | Hosted MCP + skill; API key may be required. |
| daisyUI Blueprint MCP | DIRECT MCP / LIBRARY / NEEDS AUTH | Official stdio MCP; requires Blueprint license + email. Figma token optional. |
| shadcn MCP | DIRECT MCP / CLI / REGISTRY | One global stdio MCP should serve all configured shadcn-compatible registries. |
| OriginKit MCP | DIRECT MCP / API / CLI / REGISTRY / NEEDS AUTH | Hosted MCP + registry API. This is distinct from the community Origin UI MCP already installed. |
| Shaders MCP | DIRECT MCP / API / LIBRARY / REGISTRY / NEEDS AUTH | Hosted MCP + JS package + registry; should be added to standalone bootstrap. |
| LogoAI Logo API | API / NEEDS AUTH / NOT YET WIRED | Partner-approved commercial API. Keep unavailable until account approval/docs exist. |
| Headless UI | LIBRARY | Project dependency only. |
| WebGPU | API | Browser platform API, not a remote service/MCP. |
| liquid-glass-js | LIBRARY | Source/library integration; no formal npm package recorded. |
| Motion Primitives | LIBRARY | Project component/runtime source; respect Pro licensing. |
| Anime.js | LIBRARY | Project dependency. |
| Three.js | LIBRARY | Project dependency. |
| Lenis | LIBRARY | Project dependency. |
| GSAP | LIBRARY | Project dependency; respect licensing. |
| Spline Code API | API | Runtime API for exported Spline scenes; no remote auth contract required by registry. |
| Jitter | NOT YET WIRED | No public developer API/MCP contract verified in the registry. |

**Canonical registry count: 51 integrations.**

## B. Legacy/core provider registry (`src/providers.ts`)

These providers are part of Game Shop even though they are not all represented by the canonical `integrations.ts` registry yet.

| Provider | Classification | Current Game Shop wiring |
|---|---|---|
| SpriteShip | API/PROVIDER / NOT YET WIRED | Planned; no adapter and no exposed tool. |
| AutoSprite | API / NEEDS AUTH | REST adapter implemented and tools exposed. Paid generation remains blocked by default. |
| Sprite AI | API/PROVIDER / NOT YET WIRED | Planned; no adapter and no exposed tool. |
| Spritesheet AI | API/PROVIDER / NOT YET WIRED | Planned; adapter not implemented. |
| SpriteCook | API / NEEDS AUTH | REST adapter implemented and tools exposed. Paid generation remains blocked by default. |
| AIMLAPI | API / NEEDS AUTH / NOT YET WIRED | Key is modelled, but provider adapter/tool exposure are still planned. |
| DeepSeek | API / NEEDS AUTH / NOT YET WIRED | Key is modelled, but provider adapter/tool exposure are still planned. |

**Core-provider count: 7.**

The two registries therefore represent **58 unique first-class Game Shop entries** before counting ecosystem/watchlist references.

## C. Runtime wiring reality

`integration-runtime.ts` provides a generic remote invocation layer for registered HTTP MCP/API entries. A registry item is only remotely callable when:

- it has a registered endpoint;
- required environment variables are present;
- `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true`;
- and the provider's authentication contract is compatible with the generic header logic.

Billable/generative calls also remain behind the Game Shop paid-generation guard.

Important exceptions that require provider-specific handling rather than the generic path include Ludo (`ApiKey` auth), ElevenLabs (`xi-api-key` for API calls), fal (`Key` auth), OAuth/device-flow services, and desktop/local MCPs.

## D. Ecosystem/watchlist entries not yet first-class in `integrations.ts`

The ecosystem document is broader than the canonical runtime registry. These names should **not** be silently treated as wired integrations simply because they appear in `docs/ECOSYSTEM.md`.

| Ecosystem entry | Audit classification |
|---|---|
| React Bits | REGISTRY / LIBRARY — should be project-side through its official registry/workflow. |
| React Bits Pro | REGISTRY / NEEDS AUTH — licensed project-side registry only; never proxy/mirror source. |
| Motion.dev | LIBRARY — project/runtime dependency. |
| Shaders.com (reference entry distinct from Shaders MCP) | NOT YET WIRED until canonical API/MCP identity is mapped to the verified `shaders-mcp` record. |
| Animaster LIB | NOT YET WIRED — research/watchlist. |
| vibify.club | NOT YET WIRED — research/watchlist. |
| compoentry.dev | NOT YET WIRED — discovery/reference candidate. |
| Animos | NOT YET WIRED — motion/export product, no canonical programmable contract recorded. |
| AutoAE | NOT YET WIRED — research/watchlist. |
| is.graphics | NOT YET WIRED — visual/reference candidate. |
| Liquid Logo | NOT YET WIRED — research/watchlist. |
| Godly.website | NOT YET WIRED — design reference only. |
| awesome-design | NOT YET WIRED — reference collection. |
| gitdesign.MD | NOT YET WIRED — research/watchlist. |
| skeudesign.com | NOT YET WIRED — design reference. |
| Unison Studio | NOT YET WIRED — creative-production candidate distinct from Unison Brain. |
| LogoAI (general product) | API / NEEDS AUTH / NOT YET WIRED — only the partner API record is currently verified. |
| Chatterbox AI (ambiguous product) | NOT YET WIRED — do not confuse with Chatterbox TTS. |
| Podium.global (old/ambiguous reference) | NOT YET WIRED — do not confuse with the verified `api.podium.build` record. |
| The Odin Project | LIBRARY/REFERENCE — learning resource, not runtime integration. |
| Sprixen | DIRECT MCP / API / NEEDS AUTH / NOT YET WIRED — strong candidate in ecosystem docs, but not yet promoted into canonical registry. |
| Gamelabs Studio | DIRECT MCP / NOT YET WIRED — candidate MCP pipeline, not yet canonical. |
| AI Spritesheet Maker | DIRECT MCP / NOT YET WIRED — candidate artifact-first MCP, not yet canonical. |
| Spritesheet Forge | DIRECT MCP / NOT YET WIRED — candidate image-processing MCP, not yet canonical. |
| React Three Fiber | LIBRARY — target-project runtime dependency. |
| PixiJS | LIBRARY — target-project runtime dependency. |
| Theatre.js | LIBRARY — target-project timeline/runtime dependency. |
| GitHub | API / NEEDS AUTH — infrastructure connector, not currently represented in `integrations.ts`. |
| Vercel | API / NEEDS AUTH — infrastructure connector, not currently represented in `integrations.ts`. |
| Supabase | API / NEEDS AUTH — infrastructure connector, not currently represented in `integrations.ts`. |
| Stripe | API / NEEDS AUTH — infrastructure connector, not currently represented in `integrations.ts`. |
| Resend | API / NEEDS AUTH — infrastructure connector, not currently represented in `integrations.ts`. |
| Expo | CLI / API / NEEDS AUTH as applicable — infrastructure/tooling, not currently represented in `integrations.ts`. |

## E. Standalone exposure priorities

### Tier 1 — add/repair direct MCP access now

1. Keep: Magic UI, HeroUI React/Native, shadcn, 21st.dev, Raylight, Replicate, MotionSites, Unison Brain, Origin UI community MCP.
2. Add: **OriginKit MCP** (`https://mcp.originkit.dev/mcp`).
3. Add: **Shaders MCP** (`https://shaders.com/mcp`).
4. Repair: **ElevenLabs** regional MCP endpoint/auth metadata.
5. Repair: **fal** direct authentication rather than relying on broken OAuth discovery.
6. Keep Motion registered but defer Codex login until device-flow support is handled.
7. Keep Ludo registered but treat it as custom-header auth, not normal OAuth.
8. Add daisyUI Blueprint only when its license/email are available.
9. Pin Kibo's exact Codex MCP launch contract before global automation.
10. Do not register a Meshy MCP URL until the official standalone MCP endpoint is pinned.

### Tier 2 — expose APIs directly without pretending they are MCPs

Create standalone credential/config recipes for AutoSprite, SpriteCook, Podium, Manus API, Meshy REST, fal queue API, Replicate REST, ElevenLabs REST, Scenario, Cloudinary, Mosaic Motion REST, OriginKit registry API, Shaders API, Spline Code API, plus AIMLAPI/DeepSeek once their adapters/contracts are promoted.

### Tier 3 — workstation/local capability pack

Install only on machines that intentionally host them: Spline desktop MCP, ContextCore, WanGP/Wan2GP, Chatterbox TTS, Motion AI Kit, and any GPU-heavy local stack.

### Tier 4 — project-side libraries and registries

Do not globally install runtime libraries simply to make them appear in an MCP list. Use project-aware installation for React Bits, KokonutUI, Cult UI, Animate UI, Bklit UI, Skiper UI, SmoothUI, Unlumen UI, Vengeance UI, ShaderGradient, Rive, Headless UI, Three.js, React Three Fiber, PixiJS, Theatre.js, Anime.js, Motion, GSAP, Lenis, WebGPU helpers, liquid-glass-js, and Motion Primitives.

### Tier 5 — promote or reject watchlist candidates

Verify Sprixen, Gamelabs Studio, AI Spritesheet Maker, Spritesheet Forge, Animos, AutoAE, Animaster LIB, vibify.club, compoentry.dev, is.graphics, Liquid Logo, and other research-only entries. Promotion requires a canonical URL, license, auth contract, and programmable surface.

## F. Definition of done for the standalone initiative

The standalone initiative is complete when:

- every verified direct MCP has either a global Codex registration recipe or an explicit compatibility exception;
- every verified API has a documented direct auth/config recipe without secrets in git;
- every local MCP has a workstation install recipe;
- every registry/library is intentionally project-scoped rather than misrepresented as a global MCP;
- every `NOT YET WIRED` entry has an owner/action: verify, implement adapter, promote to canonical registry, or reject;
- Game Shop remains the orchestration, artifact, QA, routing, governance, spend-control and project-context layer rather than the only way to reach providers.

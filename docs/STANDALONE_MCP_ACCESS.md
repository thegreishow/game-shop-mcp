# Standalone MCP access

Game Shop remains the orchestration gateway, but its underlying verified MCP servers can also be registered directly in a client such as Codex. This creates two usable paths:

1. **Orchestrated path** — client -> Game Shop MCP -> provider/integration.
2. **Direct path** — client -> provider MCP directly.

The direct path is useful for debugging, provider-specific work, or continuing when the Game Shop routing layer is unavailable. It does not replace Game Shop's routing, project registry, artifact handling, governance, or spend lock.

## Codex global bootstrap

From a clone of this repo:

```bash
chmod +x scripts/install-standalone-mcps.sh
./scripts/install-standalone-mcps.sh
codex mcp list
```

The script writes through `codex mcp add`, which targets the user's global Codex MCP configuration. It is idempotent in the conservative sense: if a named entry already exists, the script leaves it unchanged.

## What gets registered automatically

### Game Shop gateway

- `game-shop`

### Hosted/direct MCP servers

- `21st-dev`
- `motion-so`
- `raylight`
- `ludo-ai`
- `fal-ai`
- `replicate`
- `elevenlabs`
- `motionsites`
- `preline`

### Local stdio MCP servers

- `magic-ui`
- `heroui-react`
- `heroui-native`
- `shadcn`
- `unison-brain`
- `origin-ui`

## Why some catalog entries are not blindly installed

The Game Shop integration registry intentionally contains more than MCP servers. APIs, libraries, registries, local GPU runtimes, desktop-bound MCPs and research-only candidates are not equivalent to globally installable MCP servers.

These stay explicit/manual until their prerequisites are satisfied:

- **daisyUI Blueprint** — license + email required.
- **Spline MCP** — Spline desktop runtime must be open.
- **ContextCore** — local Python backend/index, intentionally workstation-specific.
- **WanGP / Wan2GP** — local model/runtime installation.
- **Motion AI Kit** — official installer owns its hosted MCP wiring.
- **Kibo UI** — project/registry workflow remains separate until a pinned Codex stdio launch contract is recorded.
- **Meshy** — registry currently records the REST API base; do not invent a standalone MCP URL.
- **Manus Custom MCP** — this is the ability to expose Game Shop into Manus, not another Codex server.
- **KokonutUI / Cult UI / Animate UI / Bklit UI and other shadcn registries** — use the single `shadcn` MCP plus the target project's `components.json` registry configuration.

## Authentication policy

The bootstrap never commits or embeds provider secrets. After registration:

```bash
codex mcp list
codex mcp login <server-name>
```

Use OAuth where the provider supports it. API keys and license values remain in the local environment/client credential store, not in the Game Shop repository.

## Spend policy

This standalone bootstrap does **not** set `GAME_SHOP_ALLOW_PAID_GENERATION=true` and does not weaken Game Shop's server-side spend lock. Direct provider MCPs may have their own billing behavior, so direct calls should be treated as provider-native and outside Game Shop's spend guardrails.

## Design rule going forward

Whenever a new integration is promoted into `src/integrations.ts`, classify it as one of:

- directly registerable remote MCP,
- directly registerable stdio MCP,
- MCP requiring local app/runtime,
- registry/library consumed through another MCP,
- API/CLI only,
- research-only.

Only the first two classes belong in the automatic standalone bootstrap.

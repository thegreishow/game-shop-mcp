# Standalone Access — Phase 2

Phase 2 expands the direct-access layer without weakening Game Shop's role as the orchestration, artifact, QA, routing, governance and spend-control layer.

## Phase 2 goals

1. Add verified direct MCPs omitted from the first bootstrap.
2. Repair client-specific endpoint/auth incompatibilities discovered during real Codex setup.
3. Keep non-MCP APIs as APIs instead of fabricating MCP wrappers.
4. Keep local/desktop MCPs separate from cloud/global installs.
5. Preserve free-only defaults and never write provider credentials into this repository.

## Implemented in this phase

### OriginKit MCP

Direct MCP endpoint:

`https://mcp.originkit.dev/mcp`

Registry/auth metadata already exists in `src/integrations.ts`. Global Codex registration is now part of the standalone bootstrap.

### Shaders MCP

Direct MCP endpoint:

`https://shaders.com/mcp`

Global Codex registration is now part of the standalone bootstrap. Authentication is still provider-controlled and no key is copied into this repository.

### ElevenLabs Codex compatibility repair

The canonical hosted ElevenLabs MCP endpoint remains:

`https://api.elevenlabs.io/v1/mcp`

During the user's Codex OAuth attempt, protected-resource metadata explicitly permitted:

`https://api.us.elevenlabs.io/v1/mcp`

and rejected the global hostname as a resource mismatch. `scripts/phase2-standalone-mcps.sh` therefore performs a **Codex-specific compatibility repair** only when the existing `elevenlabs` entry still points at the global hostname.

This does not change the REST API adapters in Game Shop.

## Deliberately deferred

### Motion.so

Keep the MCP registered at:

`https://mcp.motion.so/mcp`

The provider's generic-agent setup uses OAuth 2.1 device flow. The tested Codex `mcp login` path generated a localhost callback URI which Motion rejected. Do not repeatedly retry or replace the contract with an invented auth scheme.

### fal

The hosted MCP remains registered, but Codex OAuth discovery currently fails because the protected-resource metadata is not compatible with Codex's discovery requirements. The direct queue API remains valid with `Authorization: Key <FAL_KEY>`. Do not configure it as a Bearer token merely to make Codex accept the entry.

### Ludo AI

The remote MCP uses `ApiKey` header semantics. Registration can remain global, but it should not be called healthy until the client can send the required custom authentication header or a safe local bridge is implemented.

### Meshy

REST is verified. The canonical registry currently records the API base and does not pin a standalone MCP URL. Phase 2 does not invent one.

### daisyUI Blueprint

Official MCP requires a Blueprint license and account email. Install only when those credentials are intentionally provided to the local workstation.

### Local/desktop capability pack

Spline MCP, ContextCore, WanGP/Wan2GP, Chatterbox TTS and other local GPU/desktop runtimes belong in a separate workstation setup phase.

## Run Phase 2 locally

From the `game-shop-mcp` repository:

```bash
git fetch origin
git switch gameshop/standalone-mcp-access
git pull
chmod +x scripts/phase2-standalone-mcps.sh
./scripts/phase2-standalone-mcps.sh
codex mcp list
```

No API key, OAuth token, license, or paid-generation flag is written by this script.

## Next phase

After validating the new direct MCP entries, continue with standalone API recipes for AutoSprite, SpriteCook, Podium, Manus, Meshy REST, fal queue API, Replicate REST, ElevenLabs REST, Scenario, Cloudinary, Motion REST, OriginKit API, Shaders API and the legacy AIMLAPI/DeepSeek provider records.

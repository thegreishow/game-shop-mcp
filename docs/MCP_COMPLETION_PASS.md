# Game Shop MCP completion pass

Goal: finish the MCP layer before returning to standalone API work.

## Verified additions promoted in this pass

### Kibo UI
- Official MCP documentation publishes a remote server at `https://www.kibo-ui.com/api/mcp/mcp`.
- Recommended compatibility wrapper: `npx -y mcp-remote https://www.kibo-ui.com/api/mcp/mcp`.
- No authentication is required for public component information.

### Sprixen
- Native Streamable HTTP MCP endpoint: `https://api.sprixen.com/v1/mcp`.
- Auth: `Authorization: Bearer <Sprixen key>`.
- Codex should store only the environment variable name (`SPRIXEN_API_KEY`) through `--bearer-token-env-var`.
- Generation consumes Sprixen credits; registration itself does not.

### Spritesheet Forge
- Streamable HTTP endpoint: `https://mcp.clawstudiouo.com/mcp`.
- OAuth 2.1 / PKCE using GitHub as identity provider.
- Appropriate for direct Codex registration with `--url`.

### Meshy
- Official open-source MCP package: `@meshy-ai/meshy-mcp-server`.
- Reads `MESHY_API_KEY` from runtime environment.
- Registration is stdio; generation consumes the same Meshy credits as REST.

### Gamelabs Studio
- Remote SSE endpoint: `https://mcp.gamelabstudio.co/sse`.
- Auth header: `X-API-Key`.
- Because the current Codex CLI registration surface does not expose arbitrary env-backed HTTP headers directly in the add command, the bootstrap uses `mcp-remote` with `${GAMELABS_API_KEY}` interpolation and keeps the secret out of the repository.

## Auth repairs

### fal
- Official fal MCP endpoint: `https://mcp.fal.ai/mcp`.
- MCP authentication is `Authorization: Bearer <FAL_KEY>`.
- This differs from fal queue/API request examples that may use another scheme. The MCP registration is therefore repaired to use Codex's bearer-token environment-variable support.

### Preline
- Official endpoint: `https://mcp.preline.co`.
- Official Codex setup uses `--bearer-token-env-var PRELINE_MCP_TOKEN`.
- This pass repairs the existing unauthenticated registration without writing the token value.

## MCPs that remain manual/local rather than absent

### Motion AI Kit
Run `npx motion-ai@latest` and choose a global Codex installation. The official installer owns and rewrites its MCP configuration, so Game Shop should not duplicate that logic.

### Spline MCP
The Spline desktop app ships the MCP server and auto-registers supported clients, including the ChatGPT-bundled Codex configuration, after the app is opened. No standalone npm package should be invented.

### daisyUI Blueprint
Official Codex MCP is `npx -y daisyui-blueprint@latest`, but it requires a Blueprint license and email (optional Figma key). Do not install with placeholders that could be mistaken for working credentials.

### ContextCore
Local Python/backend/index MCP. It belongs on a workstation that intentionally hosts the index, not in a blind global bootstrap.

### WanGP / Wan2GP
Local MCP served by the WanGP runtime (`python wgp.py --mcp ...`). It requires the model/runtime checkout and usually GPU resources.

### Ludo AI
Remote MCP exists at `https://mcp.ludo.ai/mcp`, but official Codex setup requires a custom `Authentication: ApiKey <key>` HTTP header. The server is already registered; configure the header only when the key is available.

### Motion.so
Keep the current MCP registration. Generic-agent authorization uses OAuth 2.1 device flow; do not regress it to the failing localhost OAuth path.

## Still research-only

The earlier ecosystem names `AI Spritesheet Maker` and any remaining ambiguous/watchlist products are not promoted until an official canonical endpoint/package, transport, authentication contract, and ownership/license can be verified.

## Definition of MCP-complete

MCP work is considered complete when:

1. Every verified remote/stdin MCP is registered or has a documented credential/local-runtime blocker.
2. Auth shape is correct for each registered server.
3. Local/desktop MCPs have exact install/activation instructions.
4. Research-only names are not presented as working integrations.
5. No API-only provider is disguised as an MCP.

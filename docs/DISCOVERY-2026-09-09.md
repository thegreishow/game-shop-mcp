# Integration discovery — 2026-09-09

Game Shop integration discovery runs in parallel with execution-engine work. Only programmable surfaces that can be verified should be promoted into the runtime registry.

## Newly verified candidates

### OriginUI community MCP
- Surface: MCP + CLI-style npx launcher + OriginUI/shadcn registry access.
- Implementation: `github:kelvinchng/origin-ui-mcp`.
- Capabilities: component search, details, screenshots/previews, install-command generation.
- Classification: useful community MCP, not represented as an official OriginUI-operated service. Promote with provenance clearly marked.

### Liquid Glass JS
- Surface: open-source browser library, not MCP/API.
- Repository: `dashersw/liquid-glass-js`.
- Capabilities: WebGL refraction, blur, masking, nested glass, runtime controls.
- Classification: local UI/shader runtime candidate for websites and web apps. No npm release was verified in this sweep, so installation should use a pinned repository/vendor workflow rather than inventing a package name.

## Confirmed architecture inputs

- fal queue jobs return durable `request_id` plus status/response/cancel URLs. Game Shop now consumes status/response URLs only when they remain on `queue.fal.run`.
- Ludo generation is asynchronous over MCP and exposes `getApiJob`; generated URLs expire, reinforcing Game Shop's artifact persistence requirement.
- ElevenLabs exposes asynchronous media Flows; the speech Flow is now the first wired adapter.
- Scenario exposes a universal generation endpoint for image/video/audio/3D model families.
- MCP Tasks extension identifier: `io.modelcontextprotocol/tasks`; Game Shop execution handles are being mapped onto its durable state semantics.
- MCP Apps is the target UI extension for the Game Shop Control Center.

## Still under investigation

AutoAE, vibify.club, bklit.com, compoentry.dev, skeudesign.com, is.graphics, LogoAI, Motion.So, Animaster LIB, liquid-logo, gitdesign.MD, ContextCore, and other ambiguous entries from the original ecosystem list remain research-only until a trustworthy programmable contract is confirmed.

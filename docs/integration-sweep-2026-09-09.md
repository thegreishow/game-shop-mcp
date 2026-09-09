# Game Shop integration sweep — 2026-09-09

This pass promotes only verified programmable surfaces from the Game Shop research list. It does not treat every design/reference site as an API.

## Newly wired or corrected contracts

- Mosaic Motion / Motion.so — OAuth MCP at `https://mcp.motion.so/mcp` plus REST job API.
- OriginKit — hosted MCP plus registry API and CLI.
- Shaders.com — MCP, JavaScript API/package, WebGPU effects and shadcn registry.
- shadcn/ui — official MCP for configured registries.
- daisyUI — official Blueprint MCP contract.
- HeroUI — official React MCP stdio package.
- ContextCore — local-first Python MCP for indexed project/local-file retrieval.
- Bklit UI — current MIT `@bklit` shadcn chart registry and agent skill.
- LogoAI — commercial partner Logo API, intentionally marked auth/approval-required.
- Headless UI, WebGPU, liquid-glass-js and Motion Primitives — correctly classified as local runtime/platform/library surfaces rather than fake remote APIs.

Anime.js remains a real installed Game Shop dependency and is smoke-tested independently.

## Safety / truthfulness rules

- `needs-auth` means the contract exists but credentials, OAuth, license, or partner approval is still required.
- `local-app-required` means a cloud Game Shop deployment cannot magically reach the local runtime; a desktop/local bridge is required.
- Reference/research entries remain non-callable until an official surface is verified.
- Licensed component source must be installed from the vendor/registry and must not be mirrored by Game Shop.

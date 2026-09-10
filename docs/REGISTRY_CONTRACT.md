# Shared arcade registry contract

The authoritative arcade catalog is `thegreishow/thegreishow.com:arcade/games/games.json`.

Every playable title must include an `mcp` block with `framework`, `productKind`, `gamePath`, and `verifyPaths`, plus a `qa` block describing browser smoke expectations. Game Shop refreshes this file into runtime project overlays before MCP request handling. `GAME_SHOP_GITHUB_TOKEN` is required in the cloud runtime to read the private website repository.

Compatibility project definitions in `src/projects.ts` are fallbacks only. Do not add a new arcade title there. To add a game, add one registry record in the website repository; the MCP then discovers it from the shared registry. Non-arcade products can continue using Project Registry V2.

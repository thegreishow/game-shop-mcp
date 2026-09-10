# Controlled Game Shop build loop

The safe default workflow is:

```text
inspect registered project
→ understand goal and preservation constraints
→ create a build plan
→ select trusted/healthy capabilities
→ prepare an execution handle
→ create a gameshop/* branch
→ edit only the registered project root
→ create/reuse preview only with deploy permission
→ run structural verification and playtests
→ generate a minimal repair plan for failures
→ execute only approved repair operations
→ rerun verification/playtests
→ verify final branch scope
→ create a PR
```

## Invariants

- Never write directly to `main`.
- GitHub mutations require `GAME_SHOP_ALLOW_GITHUB_WRITES=true`.
- External network access does not imply mutation authority.
- Generation requires `GAME_SHOP_ALLOW_GENERATION=true`.
- Paid/potentially-paid generation additionally requires `GAME_SHOP_ALLOW_PAID_GENERATION=true`.
- External writes require `GAME_SHOP_ALLOW_EXTERNAL_WRITES=true`.
- Destructive external actions require `GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS=true`.
- Preview/deploy actions require `GAME_SHOP_ALLOW_DEPLOY=true`.
- Unknown integration tools/endpoints/methods are denied by default.
- A PR may only be created after the branch is verified to remain inside the registered project root.
- Compatibility code is removed only after equivalent behavior is covered by tests.

## Arcade source of truth

For The Game Shop arcade, `thegreishow/thegreishow.com:arcade/games/games.json` is authoritative. The MCP refreshes it into project overlays. Its `mcp` block supplies `framework`, `productKind`, `gamePath`, `artStyle`, `notes`, aliases, and `verifyPaths`; its `qa` block supplies browser playtest expectations.

## Release evidence

A release candidate should be tied to an exact branch/commit SHA and preview. Structural verification, required browser/playtest evidence, artifact orchestration, and repair status feed the release governor. Missing evidence blocks release rather than being treated as success.

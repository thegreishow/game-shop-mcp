# Game Shop Hardening Phase 2

Implemented on `gameshop/hardening-phase-2`:

- explicit deny-by-default integration operation allowlist
- declarative billing and mutation metadata
- canonical arcade game inventory hydration from `arcade/games/games.json`
- Project Registry V2 retained as operational enrichment
- adversarial integration/scope tests wired into CI
- package/runtime version aligned to v0.4.0
- README rewritten for current architecture

Cross-repo work on `thegreishow/thegreishow.com:gameshop/hardening-phase-2` adds registry-driven Playwright browser QA and documents the incremental Dubai Legends runtime consolidation target.

## Remaining before closing the phase

- Centralize the existing Phaser vendor blob without changing its bytes, then repoint Dubai Legends and Orbit Breaker.
- Use browser QA results to perform the first safe Dubai Legends compatibility-layer extraction.
- Reduce Vercel function count to Hobby-plan limits or move production to an appropriate execution plan. Current builds compile, but Vercel rejects deployment at patchBuild with `exceeded_serverless_functions_per_deployment` (>12 functions).
- After the function-count issue is resolved, verify current `main` health and OAuth/MCP live checks before calling production hardened.

# Game Shop Hardening Phase 2

Implemented on `gameshop/hardening-phase-2`:

- explicit deny-by-default integration operation allowlist
- declarative billing and mutation metadata
- canonical arcade game inventory hydration from `arcade/games/games.json`
- Project Registry V2 retained as operational enrichment
- adversarial integration/scope tests wired into CI
- package/runtime version aligned to v0.4.0
- README rewritten for current architecture
- Vercel serverless function budget capped at 10 deployable functions
- Vercel Git deployments gated to `main`, `release-*`, and `gameshop/release-*`
- all other branches are explicitly deployment-disabled to prevent preview churn
- CI verifies both the function budget and deployment branch policy

## Vercel release policy

The MCP repository treats a Vercel deployment as an explicit release event, not as a side effect of every development commit.

Development branches run GitHub CI only. They must not trigger Vercel deployments. A deliberate release candidate is published through `release-*` or `gameshop/release-*`, verified in Preview, and only then merged to `main` for the production deployment.

Required release gate:

1. GitHub CI passes deployment-policy, function-budget, typecheck, MCP smoke, OAuth smoke, and adversarial security checks.
2. A deliberate release branch receives a fresh Vercel Preview deployment.
3. The exact release-candidate head reaches Vercel `READY`.
4. MCP, OAuth, worker, diagnostics/storage/tasks utility routes are smoke-tested against that deployment.
5. Only a verified release candidate may merge to `main`.
6. The resulting production deployment from `main` must reach `READY` and receive production smoke checks.

This policy intentionally keeps substantial deployment headroom under Vercel Hobby limits and prevents scratch, helper, hardening, and intermediate implementation branches from consuming deployment quota.

Cross-repo work on `thegreishow/thegreishow.com:gameshop/hardening-phase-2` adds registry-driven Playwright browser QA, centralized Phaser vendoring, and the first incremental Dubai Legends compatibility-layer extraction.

## Remaining before closing the phase

- Create/update one deliberate `gameshop/release-*` candidate from the hardened branch head.
- Require that exact release-candidate deployment to reach Vercel `READY`.
- Complete live MCP/OAuth/worker/utility smoke tests against that exact Preview deployment.
- Verify both MCP and arcade hardening branches before merge/release.

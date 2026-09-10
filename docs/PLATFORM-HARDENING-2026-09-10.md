# Platform hardening — 2026-09-10

This phase prioritizes registry coherence, least privilege, external-call safety, billing safety, asset governance and security regression coverage.

## Implemented

- The website `arcade/games/games.json` is the primary arcade registry. The MCP reads it through `src/arcade-registry.ts` and generates project overlays at request time.
- Legacy MCP project definitions remain compatibility-only until live registry reads are proven reliable in production.
- Explicit operation classes: `read`, `generate`, `write`, `destructive`, `deploy`.
- External integration invocation is default-deny. Allowlisted MCP tools/API method+paths carry declarative billing and mutation metadata.
- Paid-generation keyword detection remains only as a secondary brake; declarative policy is primary.
- OAuth exposes granular generate/GitHub/integration scopes with compatibility aliases for older grants.
- Distributed rate limiting keys authenticated OAuth clients by client_id + subject, then gateway identity, then IP; process memory remains fallback.
- Asset lifecycle policy: generated → staged → reviewed → optimized → production.
- New security smoke suite covers path escape, write/branch locks, oversized placement, OAuth scope mapping, allowlist denial, paid classification, external network lock, asset promotion, secret redaction and rate-limit client isolation.
- README now describes the current platform and controlled build loop.

## Production gates kept closed by default

`GAME_SHOP_ALLOW_GENERATION`, `GAME_SHOP_ALLOW_EXTERNAL_WRITES`, `GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS`, `GAME_SHOP_ALLOW_DEPLOY`, `GAME_SHOP_ALLOW_GITHUB_WRITES`, and `GAME_SHOP_ALLOW_PAID_GENERATION` should remain unset unless explicitly authorized.

## Remaining compatibility debt

- Remove legacy project fallbacks only after the private arcade registry has reliable production credentials and tests.
- Expand operation allowlists only from verified official provider contracts; unlisted operations intentionally fail closed.
- Dedicated provider adapters should continue converging on the same declarative operation metadata instead of bespoke guards.
- Provider timeout/malformed-response tests need deterministic fetch injection/test doubles rather than real network calls.
- Runtime deletion/refactoring in individual games should happen only after the website playtest workflow is green.

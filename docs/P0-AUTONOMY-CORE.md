# P0 Autonomy Core

This pass executes the highest-priority platform backlog:

- canonical modular `/mcp` surface exposing core + platform tools
- OAuth scope enforcement across legacy MCP endpoints
- durable single-use OAuth authorization-code consumption and consent audit
- versioned migrations for executions, artifacts, QA evidence/memory, trust and OAuth
- normalized QA evidence ledger
- Playwright/Chrome worker callbacks into Game Shop
- strict release governor based on persisted terminal evidence
- Control Center evidence visibility

## Runtime follow-up

Configure the same `GAME_SHOP_WORKER_SECRET` in Vercel and GitHub Actions repository secrets so CI workers can POST terminal evidence to `/qa/evidence`.

Apply the SQL migrations to the dedicated Game Shop Supabase project before depending on durable state in production.

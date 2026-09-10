# Game Shop Phase 3

Phase 3 develops from current `main` while the Phase 2 release candidate remains frozen pending Vercel.

## Controlled game workflow

The initial workflow is deliberately repository-safe:

`inspect -> plan -> patch -> validate -> playtest -> evidence -> commit`

Every workflow resolves a configured project, derives allowed repository roots, rejects path escapes and cross-project edits, requires a non-empty diff preview, and blocks the commit gate until validation and playtest evidence are attached.

After Phase 2 releases, this branch must be rebased onto the canonical `arcade/games/games.json` registry authority so the same workflow resolves all games from that single source.

## Development policy

GitHub CI is the development gate. Vercel is reserved for deliberate release candidates and production releases.

# Universal LLM Handoff Checklist

Use this checklist before handing Game Shop to Grok, Grokbot, Claude, Gemini, Codex or another coding agent.

- [ ] `npm install` completed with repository package versions.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test:sdk-hub` passes without provider generation.
- [ ] `npm run test:provider-health` passes without provider generation.
- [ ] `npm run snapshot:ecosystem` refreshed `ecosystem.json` and `mcp.json`.
- [ ] `npm run handoff:llm` created `dist/llm-handoff/` and secret scan passed.
- [ ] Secret values remain outside git.
- [ ] `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS` is unset unless live provider execution is intentionally allowed.
- [ ] `GAME_SHOP_ALLOW_PAID_GENERATION` is unset unless billable generation is intentionally allowed.
- [ ] Replicate remains deferred until read-only auth verification succeeds.
- [ ] Kibo remains vendor-blocked until its official endpoint stops returning HTTP 500.
- [ ] Local runtimes (ContextCore/Spline/WanGP) are validated on the machine that will use them.
- [ ] Another LLM reads `AGENTS.md`, `ecosystem.json`, `mcp.json`, `docs/STANDALONE_PORTABILITY.md`, and `docs/REAL_ORCHESTRATION.md` before editing.

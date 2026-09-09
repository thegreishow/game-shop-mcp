# Game Shop Future Leap

Game Shop is evolving from an orchestrator into an evidence-driven production operating system.

## Autonomous quality loop

`build -> preview -> structural QA -> browser QA -> evidence -> repair plan -> approval -> controlled patch -> QA again -> green`

Browser QA targets Browserbase/Stagehand and Playwright MCP adapters. Evidence includes console failures, network failures, screenshots, interactions and basic performance signals. Repair remains approval-gated and repository writes remain gated by `GAME_SHOP_ALLOW_GITHUB_WRITES`.

## Self-expanding capability graph

Game Shop can query the official MCP Registry for missing capabilities, score candidates against a requested capability and exclude already-known integrations. Discovery is automatic; promotion and installation are not blind. A candidate must be verified for official identity, transport, authentication, licensing and required secrets before entering the trusted integration registry.

## Next autonomy boundary

The next safe step is a real browser adapter plus a constrained patch executor. The patch executor should only modify allowlisted projects on `gameshop/*` branches, cap repair cycles, retain evidence/provenance, and stop rather than loop indefinitely.

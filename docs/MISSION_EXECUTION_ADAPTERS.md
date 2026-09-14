# Mission Control execution adapters

Mission Control distinguishes **planning**, **dispatch**, and **verified execution**. A specialist handoff is never reported as executed merely because a task packet was created.

## Server-direct adapters

Game Shop may execute these from its server runtime only when the relevant credentials and policy gates are satisfied:

### GitHub inspection

Tool path: `gameshop_execute_mission_adapter` with `adapter=github-inspect`.

- Uses the Mission Control project's registered GitHub repo/root/branch rather than assuming an arcade-only project.
- Read-only.
- Requires a configured Game Shop GitHub runtime credential.

### Provider capability execution

Tool path: `gameshop_execute_mission_adapter` with `adapter=provider-capability`.

- Reuses the existing real provider-orchestration layer.
- Supports the configured FAL, Replicate, ElevenLabs, Scenario and Cloudinary capability lanes.
- Requires `GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS=true` plus provider credentials.
- Paid generation remains independently blocked unless the existing paid-generation policy allows it.
- Ambiguous post-submit failures are never automatically resubmitted to another paid provider.

### Browser QA

Tool paths:

- `gameshop_execute_mission_adapter` with `adapter=browser-qa`
- `gameshop_qa_capture_mission`

The automatic QA path:

1. moves the durable mission into QA;
2. records structural source evidence;
3. runs the configured Browserbase or Playwright MCP browser adapter;
4. captures screenshot, console, network, interaction and performance evidence when available;
5. persists the result in the existing QA evidence store;
6. promotes the previous automatic screenshot to `beforeUrl` and the newest screenshot to `afterUrl`, providing a true consecutive before/after record when the browser provider returns image data or a URL.

No manual screenshot URL is required for automatic captures.

## Source mutation and Repair → rerun QA

Source mutation is intentionally **not** available through the generic Execute adapter.

`gameshop_apply_patch_mission_and_rerun` requires both:

- `gameshop.write`
- `gameshop.qa`

It applies an explicitly approved replacement-file repair to a `gameshop/*` branch and then reruns automatic QA.

The GitHub repair adapter enforces:

- Mission Control's registered GitHub repo/root/branch identity;
- `GAME_SHOP_ALLOW_GITHUB_WRITES=true`;
- `gameshop/*` branch isolation;
- no path traversal;
- up to 8 replacement files;
- 120 KB per file and 400 KB total patch payload;
- optional expected-SHA preconditions;
- post-write verification that changed files remain inside the registered project root.

`gameshop_qa_repair_and_rerun` is the QA-only companion for repairs performed by another specialist. It never writes source. Call it with `assumeRepairApplied=true` only after the external/client repair actually completed.

## Client/local bridges

These lanes remain client- or workspace-mediated unless a future verified server interface is installed:

- Game Studio
- Game Development Studio
- Build 3D Game Rooms
- Unity
- Yoroll
- Lovable
- Expo / React Native

A bridge returns a structured task/return contract. Required return evidence includes status, artifacts, evidence and errors. The Mission Control job must not mark that specialist executed until the client/local runtime returns evidence.

## Scope separation

The intended authority model is:

- `gameshop.read` — project/job/evidence inspection.
- `gameshop.plan` — routing and durable mission planning.
- `gameshop.execute` — provider/client execution handoffs, never source mutation by itself.
- `gameshop.qa` — QA capture, QA transitions and reruns.
- `gameshop.write` — controlled source mutations.
- `gameshop.deploy` — release/deployment authority.

The combined repair-and-rerun mutation tool is a deliberate multi-scope exception requiring Write **and** QA.

## Authenticated E2E release gate

`scripts/mission-control-auth-e2e.ts` creates an ephemeral OAuth issuer and PKCE client at test time, then drives the actual `/mcp` request handler rather than calling Mission Control functions directly.

The gate covers three real registered products:

- TheGreiShow.com — Website controller.
- Wata Dash Game — Phaser/browser Game controller and specialist handoff.
- Cruber — App/marketplace controller.

The test verifies:

`project context → durable plan → handoff dispatch → Running → QA → Repair → QA → release scope gate → release governor gate`

It also proves that a token without `gameshop.deploy` cannot call the release tool and that an incomplete evidence set cannot reach `Released` even when Deploy scope is present.

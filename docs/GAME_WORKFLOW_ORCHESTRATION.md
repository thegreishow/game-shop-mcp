# Game Workflow Orchestration

Game Shop acts as the traffic controller for game production. It does not send every task to every tool and it does not migrate a working game to a different engine merely because another engine is available.

## Core routing rule

```text
request
  -> Game Shop project/context + safety gates
  -> GitHub source inspection
  -> select one primary runtime lane
  -> add only the specialist lanes required by the task
  -> collect QA/evidence
  -> verify source scope
  -> release review / PR
```

Primary runtime lanes:

- **Browser game:** Game Studio. Default new 2D work to Phaser; use Three.js or React Three Fiber for explicit 3D browser work.
- **Unity game:** Unity + Unity Workbench when the project already uses Unity or the design genuinely requires Unity-native physics, navigation, multiplayer, scenes/prefabs, platform builds or live services.
- **Cinematic game:** Yoroll for branching interactive-film workflows, choices, QTEs and cinematic media.
- **Hybrid:** Game Studio owns the playable runtime; Yoroll may own cinematic/story sequences with a defined artifact handoff.

Specialist lanes:

- **Game Development Studio:** asset production/vendoring, Blender/GLB/PBR work, deterministic visual debugging and measurable performance optimization through the local `game-dev` workflow.
- **Build 3D Game Rooms:** environment/room production with blocking Function, Form and Runtime approvals.
- **Tripo 3D:** optional delegated 3D-generation provider through the Game Development Studio asset-production lane. Tripo is an asset source, not the game engine.
- **GitHub:** canonical source, branch history, diffs, CI, PRs and rollback.
- **Game Shop MCP:** supervision, routing, project scope, provider/spend policy, evidence, artifact lifecycle and release governance.

## Safety boundaries

Routing is read-only. Selecting a lane does not authorize execution.

The following permissions remain independent:

1. GitHub/code writes.
2. External provider execution.
3. Paid generation/spend.
4. Local file-writing commands.
5. Hardware/GPU capture.
6. Production deployment.

Provider credentials remain outside prompts, logs, commits and MCP responses. An ambiguous paid-provider failure must never trigger an automatic second paid submission to a fallback provider.

## Local-vs-hosted reality

Some lanes cannot execute inside the hosted Game Shop runtime and must be treated as explicit handoffs:

- Unity Editor inspection/automation requires a real Unity workspace and, when Editor automation is needed, one validated Unity MCP bridge.
- Game Development Studio requires the local `game-dev` CLI.
- Build 3D Game Rooms relies on local/agent room and Blender workflows plus explicit approval gates.
- Tripo credentials and paid-provider authorization remain in the user's controlled execution environment.
- Yoroll is a remote MCP lane, but protected/credit-consuming operations require OAuth and explicit confirmation immediately before spend.

Game Shop may route to these lanes and record their evidence/artifacts without pretending its Vercel runtime can directly inspect a local editor or workstation.

## MCP tools

### `gameshop_route_game_workflow`

Produces an ordered, read-only specialist plan from:

- game brief
- phase (`create`, `upgrade`, `fix`, `audit`, `release`)
- runtime (`auto`, `browser`, `unity`, `cinematic`, `hybrid`)
- task needs
- preference
- whether the project already exists

The result includes the selected runtime, primary lane, specialist targets, ordered stages, blocking gates, cautions and invariant policies.

### `gameshop_game_workflow_matrix`

Returns the complete routing matrix and the execution surface/requirements for each specialist.

## Examples

A browser driving game with motion and stability problems routes to Game Studio for the runtime/playtest and Game Development Studio only when measurable visual/performance diagnosis is requested. It does **not** route to Unity automatically.

A Unity multiplayer game with physics routes to Unity + Unity Workbench and requires a real Unity workspace before project/editor claims can be validated.

A branching cinematic game routes to Yoroll. A normal browser game that only needs a cinematic intro remains a browser game, with Yoroll as an optional specialist lane.

A browser game needing a detailed room and custom 3D props routes room creation to Build 3D Game Rooms, asset finalization to Game Development Studio, and optionally Tripo as a guarded asset source before returning validated assets to the browser runtime.

## Validation

Run:

```bash
npm run test:game-workflow
```

The smoke suite verifies browser preservation, Unity routing, cinematic routing, 3D-room/asset routing and release governance.

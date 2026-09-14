# Project-aware Mission Control

Mission Control turns Game Shop from a capability router into a project-aware production control plane.

## Flow

`select project → load context → plan mission → dispatch specialist handoff → Running → QA ↔ Repair → Ready → Released`

Mission Control does not replace the existing execution, governance, QA or release systems. It coordinates them.

## Project registry

`src/mission-projects.ts` is the cross-product registry used by Mission Control. It supports multiple source types instead of assuming every product is a GitHub repository.

Current first-class examples include:

- TheGreiShow.com — GitHub-backed website.
- Cruber — GitHub-backed app/marketplace.
- JukeBaxx — GitHub-backed app/marketplace.
- WataDash — Lovable-backed marketplace.
- Wata Dash Game / Kingston Run — Lovable-backed Phaser game.
- Game Shop itself — GitHub + Vercel.
- Canonical TheGreiShow.com arcade games — hydrated through the existing authoritative arcade registry.

The older Project Registry V2 remains operational enrichment. It may add framework, QA, budget and brand context but it must not silently replace Mission Control source identity.

## Context loading

`gameshop_mission_context` loads before planning:

- source provider, repo/project id, root and branch where applicable;
- detected framework/runtime where inspectable;
- declared deployment plus preview history;
- recent persisted QA evidence;
- learned QA regression recipes;
- known issues derived from failed jobs, failed/blocked QA and failure/repair events;
- recent Mission Control jobs;
- specialist lanes available for the product type.

Provider-backed projects can be represented even when the Vercel server cannot directly invoke the provider. Those sources are explicitly marked client-mediated rather than being falsely described as server-executed.

## Durable jobs

Mission jobs reuse `game_shop_executions` through the existing execution store. The structured mission packet, handoffs and stage changes live in `operationResults`, avoiding a competing job database.

Console stages are:

- Planned
- Running
- QA
- Repair
- Ready
- Released

Failed and Cancelled remain terminal operational states.

`gameshop_mission_jobs` and `gameshop_mission_job` combine the execution with:

- cost/budget ledger;
- current specialist/provider handoff;
- artifact references already captured on the execution;
- persisted QA evidence;
- preview deployments;
- last error;
- rollback strategy.

## Specialist handoff contract

`gameshop_plan_mission` creates a packet containing:

- project/source snapshot;
- routed production stages;
- mission permissions;
- expected artifacts;
- required QA evidence;
- rollback strategy;
- ordered specialist handoffs.

Each handoff contains:

- target specialist;
- transport;
- instruction;
- gate;
- required OAuth scope;
- whether the handoff is client-mediated.

Examples:

- Game Studio / Build 3D Game Rooms → client plugin.
- Game Development Studio → local CLI.
- Unity → local MCP/workspace.
- Yoroll → remote MCP/client plugin.
- Lovable → client connector.
- Expo → Codex skill/local workspace.
- GitHub → Game Shop GitHub API path.
- Playwright/QA → Game Shop QA lane.

`gameshop_execute_mission_handoff` dispatches a structured packet. For client/local specialists it returns the exact task packet that the connected client must pass to that specialist; it does not claim that a Vercel server invoked a local/plugin runtime.

## Permission model

Mission Control preserves the existing independent OAuth boundaries:

- Read: project/job/context inspection.
- Plan: `gameshop_plan_mission` and routing.
- QA: visual evidence, QA stage and repair.
- Execute: specialist handoff/start/approval execution actions.
- Write: source/project mutations through existing write tools.
- Deploy: `gameshop_release_mission` and deployment actions.

Planning a mission never grants execution, writes or deployment.

## Visual QA

`gameshop_record_visual_qa` persists provider `visual-console` evidence to the existing QA evidence store. It supports:

- before screenshot URL;
- after screenshot URL;
- visual findings;
- console errors;
- network errors;
- Playwright result metadata;
- reviewer notes;
- exact project/execution/commit/preview binding when supplied.

The browser console displays before/after media plus all persisted QA providers.

Approve Ready refuses to pass while persisted evidence for the execution is failed, blocked, queued or running.

## Release

`gameshop_release_mission` requires the Deploy scope and calls the existing strict Release Governor. A job reaches Released only when the release governor is green. Mission Control does not invent a parallel release bypass.

The release governor still requires persisted structural/browser/Playwright/Chrome evidence as applicable and learned regression replay when configured.

## Rollback

GitHub-backed products use an isolated-branch/revert strategy. Verified source branches must not be overwritten before QA/release gates.

Provider-backed products use the provider revision/history model. Mission handoffs must preserve the prior working revision before generated edits are accepted.

## Browser console

`/console` now includes:

- project-aware Mission Control;
- project context and known issues;
- execution board;
- job inspector;
- handoff history;
- budget/provider/preview/rollback state;
- visual QA workspace;
- Approve / Repair / Release controls.

The console is an MCP client. The server remains the authority for scopes, spend policy, writes, external execution and release gates.

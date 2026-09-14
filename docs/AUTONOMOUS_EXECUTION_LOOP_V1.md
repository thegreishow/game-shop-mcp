# Autonomous Execution Loop v1

Game Shop treats substantial work as one canonical autonomous job instead of a loose series of tool calls.

## Canonical job state

Every job carries:

- `executionId`
- goal
- project ID, repository, project root, branch and base ref
- constraints
- authorized budget and optional provider budgets
- current stage
- artifacts
- evidence
- failures
- bounded repair attempts
- terminal outcome

Snapshots are event-sourced through the existing `game_shop_events` governance ledger when Supabase is configured, with process-memory fallback for local/static work.

## Autonomy levels

| Level | Capability |
| --- | --- |
| `observe` | Inspect state only. |
| `plan` | Plan and run browser judgement without project writes. |
| `execute` | Create controlled `gameshop/*` branches and previews, subject to existing write/deploy gates. |
| `repair` | Execute the bounded evidence → patch → preview → browser retest loop. |
| `ship` | Open a verified pull request after browser-authoritative QA passes. |

No autonomy level merges a pull request. Merge remains human-controlled. Existing environment gates for GitHub writes, external integrations and paid generation remain independent and cannot be bypassed by the job protocol.

## Browser is the judge

For web and browser-game work, Playwright is the terminal authority. A structural/code-only pass cannot complete a job.

The Playwright lane collects:

- page navigation/load outcome
- console errors
- failed requests and HTTP error responses
- snapshots
- screenshots
- bounded interactions (`click:`, `press:`, `wait:`, `fill:`)
- structured DOM/game assertions
- basic navigation/performance evidence

Supported structured assertions include selector visibility/text, title and URL checks, minimum body text, element counts and canvas readiness.

## Bounded repair loop

Failed browser evidence is classified as one of:

- build failure
- runtime exception
- broken asset
- layout issue
- interaction failure
- bad route
- network/API failure
- deployment failure
- unknown

At `repair` or `ship` autonomy, Game Shop emits a repair packet for Codex/the repair engine containing the goal, project scope, branch, classification, evidence and smallest-safe-patch instruction. The job then requires the patch result to be recorded and sends the result back through preview + Playwright judgement.

Repair attempts are bounded from 1 to 5 (default 3). Exhaustion produces a terminal failure instead of an infinite loop.

## GitHub and preview graph

The intended execution graph is:

`goal → controlled branch → change/artifacts → preview → Playwright judgement → repair if required → retest → verified PR`

Controlled changes remain limited to registered project roots and `gameshop/*` branches. Preview deployment is preview-only. Shipping verifies project scope before opening a PR.

## Measured routing

Provider/browser execution feedback now records observed:

- success/failure
- latency
- actual cost
- retry count
- QA status
- artifact acceptance

These measurements feed provider performance snapshots and score adjustments alongside the existing circuit breaker and pipeline outcomes. They inform routing but never override spend or execution gates.

## Real-project proof

`Autonomous Job Real Project Proof` runs the canonical loop against the live Dubai Legends browser game in Chromium using the pinned Playwright MCP lane. It performs a real game interaction (`#start`) and requires the scoreboard/controls and other structured assertions to pass. The proof is read-only against the live project and performs no production or repository mutation.

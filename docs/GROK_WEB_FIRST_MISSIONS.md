# Grok web compatibility missions

Use these after the OAuth connector is connected.

## Mission 1 — connection and read path

Use the connected Game Shop MCP. Do not modify anything. Confirm Game Shop is connected, list Game Shop projects, inspect the capability/integration catalog, inspect Dubai Legends read-only, and report the exact Game Shop tools actually called.

Expected: no writes, no branches, no spend, no deploy.

## Mission 2 — planning path

Use Game Shop to prepare a project-aware improvement and QA plan for Dubai Legends. Keep the session read-only. Return the execution strategy, integration routing, QA strategy, repair strategy, and deployment strategy.

Expected: planning tools only.

## Mission 3 — controlled execution

Reconnect with write/execute scopes only when explicitly desired. Create/use a `gameshop/*` branch, make one small safe improvement, verify branch scope, create a preview, run QA, and report the release-governor result. Never write directly to main.

Expected: controlled branch mutation, preview, QA evidence, no direct production mutation.

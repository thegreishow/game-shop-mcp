# App Workflow Controller

Game Shop's App Workflow Controller routes mobile, web-app, desktop, hybrid, marketplace and internal-tool work through the smallest specialist stack that satisfies the product.

## MCP tools

- `gameshop_route_app_workflow`
- `gameshop_app_workflow_matrix`

Both routing tools are read-only. They do not authorize project writes, provider execution, payments, deployment or store submission.

## App kinds

- mobile
- web-app
- desktop
- hybrid
- marketplace
- internal-tool

## Key routing rules

- Native/device capabilities route to Expo / React Native and a local/workspace-capable implementation lane.
- Existing applications preserve their current framework unless requirements justify migration.
- Backend, auth, data and payments are requirement-driven, not automatically added.
- Payments route through the commerce lane only when product intent requires them.
- Device permissions, camera, location, notifications, offline behavior, deep links and native modules require platform-aware fallbacks.
- Browser QA alone is insufficient for native behavior; native targets need build/runtime validation.
- Web surfaces use preview-first release policy.
- Native store submission remains a separate explicit release action after verified builds.

## Marketplace example

A marketplace such as WataDash or Cruber can route through:

`Game Shop → source inspection → UI → data/backend/auth → payments if required → device/location/notification capabilities if required → observability → QA → preview/build → release gate`

The controller does not hard-code those services when a real project already uses another valid stack.

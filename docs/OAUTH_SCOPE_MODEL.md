# OAuth scope model

Game Shop advertises six OAuth scopes:

- `gameshop.read` — catalogs, projects, status and read-only inspection
- `gameshop.plan` — build/project planning and execution preparation
- `gameshop.execute` — external integration and generation execution
- `gameshop.qa` — browser QA, verification and diagnostic workflows
- `gameshop.write` — controlled repository mutation on `gameshop/*` branches
- `gameshop.deploy` — preview/deployment operations

The recommended Grok.com first connection requests only `gameshop.read gameshop.plan gameshop.qa`. Elevated scopes should be granted only when the user intends the corresponding action.

Note: the current OAuth token records scopes and exposes them to the gateway. Fine-grained per-tool enforcement is a follow-up hardening step; existing Game Shop write/spend/deploy policy gates continue to protect consequential actions in the meantime.

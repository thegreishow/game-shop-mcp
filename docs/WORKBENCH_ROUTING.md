# Workbench routing

`gameshop_workbench` 1.2 requires a declared capability match before ranking an
integration. Shared product domains, marketing notes and configured credentials
cannot qualify an unrelated provider. Results include `matchedCapabilities` so
clients can inspect the recommendation evidence.

For predictable, smaller plans use explicit lanes and compact output:

```json
{
  "goal": "Repair Rasta Runner jump timing and validate the existing game",
  "projectId": "jamaica-run",
  "lanes": ["code", "qa"],
  "detail": "compact",
  "maxCandidatesPerLane": 2
}
```

Both fields are optional. Full output remains the default. Explicit lanes replace
heuristic inference. Inferred lanes use word boundaries and skip common negative
clauses; this is not a general natural-language parser. Use explicit lanes for
ambiguous instructions. Neither mode performs external calls or authorizes writes,
generation, billing or deployment.

Libraries and browser APIs run in the project workspace, local MCPs need their
host, and references are not executable. `callableNow` means configured and
externally enabled, not a successful health probe or permission for every operation.
Providers marked `needs-auth` without a registered credential contract are not
assumed authenticated. Existing spend and operation gates still apply.

Run `npm run test:game-workflow` for routing regressions, including the workbench
checks. The full `npm test` suite includes these checks.

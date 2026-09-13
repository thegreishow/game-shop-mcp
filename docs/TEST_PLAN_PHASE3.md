# Phase 3 test plan

Automated CI must pass before merge:

1. TypeScript typecheck
2. MCP smoke
3. OAuth PKCE smoke
4. adversarial security smoke
5. SDK Hub smoke
6. provider-health smoke
7. Real Orchestration Phase 3 smoke
8. deterministic ecosystem/mcp snapshot generation
9. JSON validation

Post-merge live test should use a low-risk configured provider path first, with external integrations explicitly enabled and paid generation left disabled unless the operator deliberately chooses a paid generation test. Cloudinary asset upload/placement is the preferred non-generation end-to-end path when credentials are available.

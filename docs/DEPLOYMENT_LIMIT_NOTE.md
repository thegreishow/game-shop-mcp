# Deployment limit handoff

OAuth code and compatibility docs can be merged independently of Vercel capacity. When deployment capacity returns, deploy `main`, run the live OAuth verifier, then complete the Grok.com connector flow. No additional code changes should be required merely because the earlier OAuth deployment was blocked by quota.

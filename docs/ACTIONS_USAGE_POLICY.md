# GitHub Actions usage policy

Game Shop treats hosted GitHub Actions as a scarce release-verification resource.

## Default development path

1. Develop through Codex/Game Shop locally.
2. Run TypeScript, smoke tests, browser QA, and Playwright/Chromium locally first.
3. Batch related changes before opening or re-opening a pull request.
4. Use hosted Actions only for deliberate final verification.

## CI trigger policy

`Game Shop CI` does not run on every push. It runs when a pull request is first opened, when a pull request is explicitly re-opened after a final fix batch, when a draft is marked ready for review, or when manually dispatched.

This means incremental commits to an already-open pull request do not consume another hosted runner automatically. If additional fixes are required after a CI run, validate them locally, batch them, then deliberately re-open the pull request or manually dispatch CI once.

## Scheduled jobs

Provider reconcile and autonomy sweep remain available as manual workflows but have no recurring GitHub-hosted schedule. Background reconciliation should prefer the existing Game Shop/Vercel worker path or a future non-Actions scheduler.

## Heavy browser jobs

Playwright QA, Chrome diagnostics, and OAuth live verification remain manual-only. Prefer the local Playwright lane for development-time browser judgement.

## Rule of thumb

Local tools are the development loop. GitHub Actions is the final referee.

# GENESIS X 1.0 — current-main integration readiness gate

**2026-11-22 · research-only, no merge, no production wiring, no Vercel release**

## Reason for another gate after PR #44

PR #44 proved that the **then-current** NERYX app and experimental GENESIS X worker could coexist through an in-memory, optional Service Worker overlay. It did **not** perform a Git merge or verify the latest main revision. The active `main` moved since the earlier audit, including two updates to the historic phase-7.10/7.11 research JSON files. Green tests from an older main revision cannot authorize the next release.

At setup, `main` was `8f9726ddfd0e913fd0a428f47b89671c834c8ef6`, while the experimental source parent PR #44 was `f54ebe088f026044b13bda9506bc93bfa473d84e`. **The CI fetches current `origin/main` again at execution time** and prints the exact SHA actually tested, rather than hardcoding either commit.

## Test method

- `.github/workflows/neryx-genesis-x-10-current-main-release-gate.yml` makes isolated detached Git worktrees from current `origin/main` inside throwaway GitHub Actions VMs.
- It copies only the experimental `modules/genesis-x*.js`, `eval/tests/genesis-x*.test.mjs`, and test-only `eval/genesis-x-{sw-overlay,real-sw-overlay-smoke}.mjs` to the detached worktree. Other NERYX files are sourced from **current main**, not the stacked experimental branch.
- The Node job runs all available NERYX, evaluation corpus and GENESIS X tests together.
- Both real-browser jobs first run the **unchanged main application's offline smoke test** in Chromium/WebKit. Then each runs PR #44's deliberate Service Worker overlay scenarios on the same main-derived worktree:
  - all 13 experimental scripts present: normal NERYX app cold-reloads offline and a **new** research Worker returns review metadata only;
  - intentionally missing GENESIS X dependency: normal NERYX app still cold-reloads offline, experimental cache remains empty.
- The Workflow checks Git commit identity and rejects any changes to the production files `app.js`, `index.html`, `sw.js` or the Frozen seal in this PR.

## Explicit non-goals

This is not a product integration. The overlay is generated **in memory by the local test HTTP server** from the actual service worker and never saved to the GitHub branch as a replacement for `sw.js`. The only app script loaded experimentally during the browser test is the worker client, not a public release route or automatic startup. Neither the app's localStorage schema nor the DOM is altered by this PR.

No independent sealed accuracy benchmark has been performed. Successful synthetic regression and WebKit/Linux smoke tests do not establish real iPhone Safari compatibility, trustworthiness or safety against hostile same-origin scripts. An explicit user-approved production release remains blocked.

## Decision gate

**Accept as research-ready** only if the four GitHub Actions jobs complete green with fresh current-main SHA in the logs. Regardless of CI result, **do not** merge the stacked research branches into `main`, deploy them to a production domain, enable auto-loading, or change user data. Additional test results may be appended below after the workflow actually runs.

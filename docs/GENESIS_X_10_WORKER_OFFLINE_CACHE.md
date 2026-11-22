# GENESIS X 1.0 — test-only cold offline worker restart

**Research-only draft PR.** This is an actual offline **reload plus new Worker creation** test with a temporary same-origin Service Worker, not a production service worker change.

## Design

- `eval/genesis-x-worker-offline.html` is an isolated page which loads **only** the GENESIS X worker client, never the NERYX app.
- `eval/genesis-x-test-offline-sw.js` is a test fixture. The test server explicitly authorizes its root scope with `Service-Worker-Allowed: /`. The fixture precaches exactly the page, client, worker entry and 11 engine modules (14 assets total) under a dedicated cache name. Its fetch handler serves only allowlisted cache entries and never a network fallback.
- `eval/genesis-x-worker-offline-restart.mjs` launches Chromium/WebKit; registers the test Service Worker; checks control, the exact precache inventory, and a successful worker invocation while the server is up. It then **closes the local origin server**, reloads the HTML document and asks the reloaded page to **create a new Worker** through the client. It validates the returned non-publishable review-only metadata, null/sparse rejection, no leakage of engine globals to the page, and zero localStorage writes.
- GitHub Actions verifies both browser engines, all NERYX/GENESIS X Node tests and protected-file invariants.

## Threat model and caveats

This proves offline startup **only for this test-only cache configuration** in Playwright Chromium/Linux WebKit. It does not prove that NERYX's existing `sw.js` caches GENESIS X or that GENESIS X loads when offline in the released PWA. Linux WebKit is not iOS Safari or an actual iPhone 16.

No production files, `main`, app storage or Frozen evaluation change. The isolated cache is in the disposable Playwright browser context. A browser Worker is same-origin code separation rather than a sandbox for hostile same-origin scripts.

A successful offline cold worker restart is still **not a production integration approval**.

## Executed CI evidence — 2026-11-22

[GitHub Actions run #45009849779](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45009849779) completed **success**, with four successful jobs:

- Chromium: `GENESIS_X_WORKER_COLD_OFFLINE_OK`, **14 cached assets**, new checked Worker response after offline reload, no main-thread research engine globals, zero localStorage writes.
- WebKit: identical successful cold offline startup and same cache/metadata checks.
- Existing Node regression suite: **595 passed, 0 failed**.
- Protected files: pass; no changes to `app.js`, `index.html`, `sw.js` or `eval/frozen.seal.json`.

Both browser jobs recorded **17 server requests before shutdown**, and the new Worker returned `review_required` after the origin stopped. This validates the **test fixture's precache**, not production NERYX's `sw.js` or real iPhone Safari.

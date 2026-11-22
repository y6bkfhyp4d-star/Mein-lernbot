# GENESIS X 1.0 — compatibility audit against existing NERYX Service Worker

Research-only draft, stacked on #43. We did **not** change the production `sw.js`, `index.html`, `app.js`, `main`, Frozen, or user storage.

## Current production Service Worker behavior
`sw.js` uses cache `neryx-offline-v4` and installs the index page plus the local script tags listed in the index HTML, manifest and icon. Other `.js` requests get network-first fallback **only if the URL is already cached**. The GENESIS X worker entry and its `importScripts` dependencies are not all part of the current app-shell precache. Consequently current production NERYX cannot be claimed to cold-start GENESIS X offline.

## Safe extension proposal (not enabled in production)

`eval/genesis-x-sw-overlay.mjs` takes the exact production SW source, **verifies expected anchors**, and generates an ephemeral overlay in memory. The test HTTP server serves the overlay on `/sw.js`, but the repository's `sw.js` remains byte-for-byte unchanged. The overlay:
- Fetches the fixed allowlist of 13 additional worker/client/engine scripts during installation.
- Downloads and checks all optional scripts before writing any of them to the existing cache.
- If any optional script is missing, **disables the entire experimental precache** and continues installing the normal NERYX app shell. No partial experimental bundle should be written.
- Reuses the existing NERYX Service Worker's normal cache and network-first fallback. It does not change the app HTML or add GENESIS X startup scripts.
- Performs no auto-enable, code execution beyond the separately opted-in test invocation, or storage migration.

`eval/genesis-x-real-sw-overlay-smoke.mjs` opens the actual `index.html`, allows the NERYX code to register `/sw.js`, checks the cached production app assets, shuts down the real origin, reloads the actual application, then optionally loads only the worker-client from cache and creates a new GENESIS X Worker fully offline. In a second isolated browser context it deliberately makes the optional Logic module return HTTP 404; the ordinary NERYX app must still restart offline and the entire optional bundle must be absent.

Runs on Chromium and Linux WebKit, plus all Node evaluation and corpus regressions.

## Release and risk boundaries

**This is a simulation, not a product change.** The in-memory SW source modification is not installed on real users' devices and no source file is changed. A later reviewed product change would need to consider cache sizing/quotas, failed module upgrades, version pinning, integrity and cross-origin policy, old-worker migration and real iPhone Safari behavior. Optional file fetches still add network load during installation when explicitly enabled.

The research Worker remains same-origin JavaScript, not an isolated security domain against malicious scripts. Its preview output remains `publishable:false` and does not establish correct real-world answers.

**Production merge remains blocked.**

## Observed CI results — 2026-11-22

[GitHub Actions #45010203807](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45010203807): **all four jobs successful**. Regression: **595/595 passed**; protected-file check passed.

| Real browser | Optional GENESIS X complete | Optional GENESIS X missing |
|---|---|---|
| Chromium | 55 total cache assets; 13 experimental assets; app restarted offline and Worker returned `review_required` | 42 app assets; **0** experimental assets; normal NERYX app restarted offline |
| WebKit | 55 total cache assets; 13 experimental assets; app restarted offline and Worker returned `review_required` | 42 app assets; **0** experimental assets; normal NERYX app restarted offline |

Both scenarios also confirmed the real app's controlled offline page exposes chat and send controls, and no network request occurred after the local server was shut down. This supports *a possible safe opt-in caching design*, **not** actual production activation.

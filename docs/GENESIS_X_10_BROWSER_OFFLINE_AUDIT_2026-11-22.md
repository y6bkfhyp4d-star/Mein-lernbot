# GENESIS X 1.0 — isolated real-browser and offline audit

**Date:** 2026-11-22. **Scope:** CI/evaluation scripts/docs only; research branch `neryx/genesis-x-10-browser-offline-audit`, stacked on PR #39. No main merge, product integration, service worker edit, storage write or Frozen change.

## Test design

`eval/genesis-x-browser-offline-smoke.mjs` starts a disposable loopback HTTP server serving **only** an empty isolated test page and ten allowlisted GENESIS X JavaScript modules. It launches real Playwright Chromium or WebKit (mobile viewport, touch and isMobile enabled for WebKit), verifies all nine research-capability modes loaded, then **closes the origin server**. It verifies purely in-browser that:

- A checked numeric/logic chain returns `execution_checked`, but `publishable:false`.
- The facade suppresses unverified chain predictions (`exploration_only`, no `report.cases`).
- Null verifier and sparse cases/claims fail as `invalid`.
- A new research hypothesis is checked once; identical audit references are rejected on second use by the in-memory ledger.
- No production orchestrator is loaded, browser storage remains empty, no unexpected page errors occur, and no new server requests are generated after origin shutdown.
- An explicit request interceptor refuses external origin requests, so no external network service can silently supply data.

The CI matrix also separately runs the existing NERYX production-app offline smoke (`eval/browser-offline-smoke.mjs`) under Chromium and WebKit, unchanged. These tests are separate: isolated GENESIS X execution is **not** evidence that it is connected to or used by production NERYX.

## Interpretation and limits

Playwright WebKit on a Linux runner approximates some Safari engine behavior but **is not an actual iPhone Safari test**. A mobile viewport is not an iOS hardware security/performance test.

The isolated offline check runs already loaded JavaScript after server shutdown; it is **not** a test of automatic offline caching or installing the GENESIS X modules through NERYX's service worker. The existing app smoke separately checks NERYX's own offline caching.

No production activation or merge is authorized. Further gate: explicit integration design, actual synthetic merge CI, device checks and independently managed sealed benchmark.

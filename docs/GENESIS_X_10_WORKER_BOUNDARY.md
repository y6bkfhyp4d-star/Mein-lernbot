# GENESIS X 1.0 — isolated Web Worker preview boundary

Research-only draft stacked on integration-preview PR #41. **No NERYX production wiring, deployment, user storage, Frozen changes or main merge.**

## Design

The main thread loads only `modules/genesis-x-worker-client.js`. Its fixed same-directory worker URL `genesis-x-worker.js` is derived from the script's actual URL, compatible with subpath hosting. The client exposes a single `preview(task):Promise<reviewMetadata>` operation; it spawns a fresh classic Worker per request, limits serialized input to 30 KB, terminates the worker on completion or on an eight-second timeout, and independently validates every returned field.

The classic worker loads the 11 allowlisted research modules with static `importScripts` paths and executes inside a Worker global realm, **not on the main page**. The legacy engine modules refer to `window`, so this worker sets `self.window=self` in the worker realm only. Its message protocol is strictly `{version:1,id:1,kind:'preview',task}`, and its **only** output is `{version:1,id:1,status,publishable:false}` with optional integer counts and boolean reference-match marker for `review_required`. It never returns raw calculations, candidate predictions, chosen strategies, arbitrary exception strings, training samples or audit truths.

The client itself also reduces responses to an allowlisted, frozen metadata object. Malformed, oversized, timeout or unexpected worker outputs are rejected or blocked. Only the existing non-publishable integration-preview method is called; no direct `checked` or `chain` results are exposed to the page by this protocol.

## Threat-model limits

A Worker gives *execution-context and API separation*, not a trust sandbox against same-origin malicious JavaScript. A malicious script on the main thread can replace the client, create its own workers or make its own requests. Same-origin code and imported worker scripts are trusted; cryptographic source integrity, hostile main-frame protection, persistence or a sealed independent benchmark are not provided.

A fresh worker is initialized for each request, so **no audit ledger persists between requests**. This protocol only returns checked computation *review metadata*, not research-performance results or a release decision. The integration preview's summary remains bound to caller-provided references, so a matched reference is not independent truth.

The worker is loaded from the network/cache for each request; this implementation does **not** alter the service worker or automatically cache GENESIS X for offline startup. Offline operation after a restart is not claimed. Worker loading under a future Content-Security-Policy and iPhone Safari must be verified before any app integration.

## Tests

`eval/genesis-x-worker-browser-smoke.mjs` exercises actual classic workers in Chromium and mobile-emulated WebKit. It checks successful metadata, caller reference matching, bad references, null/sparse input, no research globals on the main page, no local storage writes, no NERYX app load and static allowlisted imports. All previous Node regression suites and the unchanged NERYX application browser smoke remain mandatory.

**Status: experimental only; production release BLOCKED.**

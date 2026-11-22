# GENESIS X 1.0 – Non-publishable integration preview

Draft-only research branch `neryx/genesis-x-10-integration-preview`, stacked on the experimental offline browser audit PR #40.

## Intent

`modules/genesis-x-integration-preview.js` is a **separate, opt-in module** that defines a prospective one-way integration contract. Nothing in the live NERYX app imports or calls this module.

It accepts a bounded structured GENESIS X numeric/logic task, calls **only** the existing `research-lab.run({mode:'checked',input:task})` path, validates the expected checked-result structure, then returns **only** a frozen, non-publishable review summary:

- `status:'review_required'`
- `publishable:false`
- `checkedCases` and `referenceCases`
- `allReferencesMatched`
- An explicit note: internal computational consistency is *not* factual truth or release authorization.

All per-case values, decisions, programs, rules and raw audit reports are discarded. Invalid inputs return `invalid`; missing dependencies `unavailable`; blocked/malformed internal responses `blocked`. No auto-upgrade, dynamic code execution, storage, network calls or user-facing answer API.

## Critical security boundaries

- **This is a *preview of an interface*, not a sandbox or a security boundary against malicious same-page scripts.** `window.NERYXGenesisXChain` and other low-level globals can still be called directly.
- A malicious script replacing the entire facade with a correctly shaped fabricated report can still deceive shape checks. A version string, `Object.freeze` and structural contract are not authentication or independently trusted provenance.
- `allReferencesMatched` records only matches to **caller-provided** reference labels, which are not an externally sealed oracle.
- The research facade still exposes research reports through its own other modes. This adapter never makes those modes safe for user-facing answers.
- No actual NERYX production integration has been performed, and the app service worker does not cache this new module.

## Verification

`node --test eval/tests/genesis-x*.test.mjs` including `genesis-x-10-integration-preview.test.mjs`, followed by the entire NERYX evaluation/corpus/smoke suite. Experimental CI also checks that production entrypoints and Frozen seal remain unchanged.

**Release gate remains BLOCKED** pending independent supervised benchmarking, an explicit trusted integration design, browser/device checks of the eventual integration itself, full synthetic merge validation and user approval.

No changes to `main`, `app.js`, `index.html`, `sw.js`, or `eval/frozen.seal.json`.

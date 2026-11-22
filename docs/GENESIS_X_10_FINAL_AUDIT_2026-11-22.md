# GENESIS X 1.0 — final audit evidence and release gate

Date: 2026-11-22. Target repair chain HEAD: `39f7f94723e534578feac0a75fff7b74957c336d` (branch `neryx/genesis-x-10-fix-truth-d`). Audit-only branch: `neryx/genesis-x-10-final-audit`.

## Scope

The six issue families from the original Claude-assisted review have been addressed through stacked draft PRs: A/B #30, H #31, B2 #32, C #33, D #34. The last repair CI run https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45006489977 completed successfully with 106 main regression tests and 12 original reproduction/characterization tests, with no failures.

This audit branch adds independent test `eval/tests/genesis-x-10-final-audit.test.mjs` and a full wildcard-scope GENESIS X CI job, without modifying the implementation. Run all matching test suites via `node --test eval/tests/genesis-x*.test.mjs`. Characterizations are **not** proof of security or accuracy outside provided examples.

## Release gates and remaining risks

**Product release: BLOCKED** for the following reasons:
1. GENESIS X is not imported into the live NERYX app; no browser or iPhone Safari compatibility/performance test exists.
2. `execution_checked` establishes that a separate interpreter reproduced the declared computations, not that the strategy is objectively true. The external audit references are caller supplied and may be reused. No independently managed sealed evaluation has demonstrated reliable generalization.
3. JS global version strings and same-execution artifact snapshots are compatibility checks, not trusted code integrity guarantees against arbitrary same-page scripts.
4. The facade is a research dispatcher. Even with `publishable:false`, raw modules remain accessible on `window`. Any future production consumer needs a distinct, controlled adapter and threat-model review.
5. Current `modules/genesis-x-research.js` uses destructuring in `run({task,audit}={})`: direct `run(null)` throws a TypeError, unlike the facade which handles null. Audit tests document this as an additional **low-severity input-hardening defect**. It is not a presently confirmed live app exploit. This branch intentionally does not fix it.
6. All experimental PRs are stacked and still drafts. No explicit merge approval, no independent third-party code review or validated deploy procedure.

**Experimental research: continue** on isolated branches. Before proposing a main merge, repair the newly characterized null-call fault, add automated end-to-end browser/offline tests and controlled independent holdout evaluation, explicitly review every stacked PR and reconcile the branch history.

## Audit interpretation

The documented A/B/B2/C/D/H regression tests are expected to be green after repairs. A green full corpus demonstrates the configured test conditions, not exhaustive security, inherent model learning, worldwide novelty or autonomous intelligence.

No external Claude audit has yet been performed on the final repaired HEAD. Claude's earlier review applied to the old, unrepaired source and partial stubs; it is not a sign-off on the new code.

Keep `main`, app.js, index.html, sw.js, user storage and `eval/frozen.seal.json` untouched. Never auto-promote, auto-install or activate the research engine.

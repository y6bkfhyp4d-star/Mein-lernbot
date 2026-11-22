# GENESIS X 1.0 — architecture and release-risk review (2026-11-22)

**Verdict: NO RELEASE / NO MERGE TO MAIN.** Static, source-level review of branch `neryx/genesis-x-10-research-integration` at `4e0dff528192f2d5a7e1df5a3f68e159c05f8208`. This is not a Claude review, penetration test, or external holdout evaluation. The latest CI run for this branch reported 85/85 tests passed; that does not establish product readiness.

## Findings by priority

### P0 / release blocker — unchecked pipelines exposed by the unified facade
- `modules/genesis-x-research-lab.js` registers the mode `chain` invoking `NERYXGenesisXChain.solve` (0.5) and also exposes `numeric`, `logic`, `routing` with status `candidate`.
- `modules/genesis-x-chain.js` explicitly returns candidate case outputs without invoking the independent verifier. There is no allowlist that prevents a consumer from treating these as publishable answers.
- The facade returns these outputs unchanged; its generic `permitted` set checks only whether a status is recognized, not whether it is appropriate for the selected mode or safe to publish.
- **Fix:** distinguish exploration APIs from approved result APIs; production adapter must expose only a fail-closed checked path with a strictly specified output schema and policy. Test that `chain` mode cannot feed a user-facing answer.

### P1 — no immutable provenance of candidate program and logic AST
- `modules/genesis-x-verified-chain.js` reruns `router.solve()` to reconstruct candidate rules after `chain.solve()` already ran. Neither stage returns a signed or immutable descriptor of exactly the strategy that produced the results.
- A matching recomputation of the reconstructed candidate establishes internal arithmetic agreement, not truth of the selected strategy and not correspondence to the original candidate if selection is non-deterministic or substituted.
- **Fix:** have a controlled orchestrator obtain an explicit program/rule once and preserve their immutable identity (canonical JSON/hash). Evaluate and verify that exact artifact; test that any artifact mismatch fails closed.

### P1 — holdout provenance and selection contamination
- `modules/genesis-x-research.js` checks `x`-value non-overlap but cannot establish that reference truths were sourced independently. Repeated runs on the same public audit set can overfit to it.
- `modules/genesis-x-diagnostics.js` sees task input `cases`; if caller includes `truth` there, the hypothesis selector can see reference labels. The research routine keeps `audit` separate from `task`, but does not forbid selection-case truth or record audit provenance.
- **Fix:** require an explicit separated immutable dataset contract (training / selection-validation / final evaluation), reject reference labels in the hypothesis input, record provenance and test-set reuse, and keep a truly independent benchmark outside the repository.

### P1 — status semantics and output schemas inconsistent
- `modules/genesis-x-research-lab.js` accepts a union of all statuses for every mode; only `report.status` is checked. For example a substituted numeric engine with version `0.2` could return `{status:'execution_checked'}` and the facade would pass it through.
- Version properties and exposed `window` APIs are not an integrity boundary; they can be replaced at runtime. An `Object.freeze` wrapper does not freeze third-party module bindings or nested outputs.
- **Fix:** per-mode status schemas, strict typed validation, immutable result shape and dependency pinning; do not treat Javascript global versions as a security guarantee.

### P2 — bounded search is limited but not generalized
- 0.2 searches a fixed handful of arithmetic operators and user-provided constants; 0.3 checks simple Boolean comparisons and two-literal combinations; 0.5 is always numeric-then-logic. No autonomous general reasoning, code learning or novel algorithm creation is demonstrated.
- The tests exercise the same finite families the algorithms implement. Success there should not be presented as broad intelligence or unique worldwide invention.
- **Fix:** explicit benchmark baselines, difficulty groups, negative controls, out-of-distribution tests, and separate claims for consistency, coverage and accuracy.

### P2 — fragile array/data validity
- `modules/genesis-x-research.js` requires disjoint numeric `x` but does not enforce disjointness over the whole multidimensional tuple `(x,b)`; this may be intentionally conservative, but must be documented and evaluated.
- `modules/genesis-x-diagnostics.js` validates some input parts differently than the solver itself. A uniform central schema validator would reduce drift and unexpected `unconfirmed`/ `invalid` conversions.

## Release gate

1. Keep all experimental PRs #19–#27 **draft/unmerged** and never enable in app entrypoints pending review.
2. Add regression tests demonstrating bypass of checked routing, mismatched candidate provenance, substituted module/status, task-case reference labels and repeated audit reuse.
3. Fix P0/P1 issues in separate branches with CI, and review whether external auditors can access a truly sealed benchmark without data leakage.
4. Run complete NERYX integration, browser/offline, iPhone Safari, and previous Frozen evaluation only after the appropriate explicit approvals. `eval/frozen.seal.json` is not active.
5. Request independent critical review (Claude or a human reviewer) and reconcile disputed findings against code and tests before proposing a release.

**Scope:** document-only review. No code was changed in this branch and no automated exploitation/reproduction test was executed for these findings yet. Severity designations are conservative release risk assessments, not proof of exploitable attacks in the live application.

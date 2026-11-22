# GENESIS X 1.0 — D: selection-reference separation

This change is stacked on `neryx/genesis-x-10-fix-sparse-c` and remains research-only.

## Problem and resolution

The bounded 0.8 diagnosis used `task.cases` as selection examples and then passed them into 0.7's verifier. Any caller-provided `truth` in those cases could change diagnosis from `no_change` to `blocked`. Consequently reference labels had influenced hypothesis decision-making.

The diagnosis now **rejects any own `truth` property** in selection cases and in either numeric/logic training or validation records. The property is rejected even if its value is `undefined`, `false` or `null`. Existing `expected` classification labels in logic training/validation remain valid; they are required supervision, not held-out evaluation references. Sparse cases remain invalid.

The 0.9 research workflow may still accept `truth` in its separate `audit` argument. The 0.9 implementation calls 0.8 diagnosis with only `task`, before constructing verified evaluation cases with the supplied audit truths. It never passes audit truth to candidate generation. This preserves the split between selection inputs and evaluation references.

## Tests and boundaries

`eval/tests/genesis-x-10-truth-d.test.mjs` checks the unlabelled proposal, separate `coverage_gain_observed` result, reference label rejection in five different selection collections, falsy values, unchanged reference objects and the `no_change` control. It also retests the originally red finding D with original modules.

This is a **data-flow guard**, not an independent secret benchmark. The audit references are caller-provided, repeat use is not tracked, and the algorithm searches only one fixed constant expansion. No proof of accuracy gain, novel general intelligence or deployment readiness is claimed.

None of `app.js`, `index.html`, `sw.js`, user storage, `main` or the Frozen seal is modified. Next step after the six issue-family fixes is one end-to-end review, not automatic merging or deployment.

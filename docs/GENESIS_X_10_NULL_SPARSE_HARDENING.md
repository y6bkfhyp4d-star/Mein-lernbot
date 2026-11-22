# GENESIS X 1.0 — null and verifier sparse-array input hardening

Stacked experimental Draft PR on `neryx/genesis-x-10-audit-ledger-session`.

The five public data-processing functions `NERYXGenesisX.compare`, `NERYXGenesisXTools.compose`, `NERYXGenesisXLogic.learn`, `NERYXGenesisXVerifier.verify`, and `NERYXGenesisXResearch.run` previously destructured function parameters with `={}`. That default applied only for `undefined`, not `null`, causing a TypeError for direct null inputs. They now normalize non-record inputs to empty records, causing the existing validation to report `invalid` without throwing.

Verifier 0.6 also used `.some()` for `cases` and `claims`. Sparse array holes skip the callback, but iteration later yields `undefined`, causing a TypeError. Validating with `Array.from(...).some(Boolean)` checks every position, including holes. The chain's earlier sparse-array fix remains intact.

`eval/tests/genesis-x-10-null-sparse-hardening.test.mjs` covers every affected public function, malformed input shapes, sparse verifier claims and cases, explicit undefined, length-20 sparse arrays, and dense-reference controls. The old final-audit characterization that expected `run(null)` to throw is now a green `invalid` assertion.

Run `node --test eval/tests/genesis-x*.test.mjs`. No production changes, network, storage, Frozen mutation, automatic deployment, or assertion of full safety. The session ledger is still RAM-only; audit truth remains caller-provided.

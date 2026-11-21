# GENESIS X 0.7 – fail-closed verified chain experiment

**Status:** isolated research integration of existing 0.5 chain and 0.6 verifier. Not production-ready.

- `modules/genesis-x-verified-chain.js` exposes `window.NERYXGenesisXVerifiedChain.solve(task)`.
- Requires explicitly loaded isolated 0.2 numeric, 0.3 logic, 0.4 router, 0.5 chain and 0.6 verifier modules.
- The 0.5 chain currently returns outputs but not its rule/program candidates. 0.7 reconstructs the candidates by re-running the deterministic router on the **same samples**, then validates each chain output through the independent 0.6 evaluator. Non-deterministic or conflicting results are blocked.
- Every case and output shape is checked before accepting an audit; mismatches and malformed output **block predictions**.
- A successful result uses `status: 'execution_checked'`, not `verified`. This proves agreement with the selected candidate interpretation only, **not** that the inferred rule is true or generalizes to unseen reality.
- Optional `cases[].truth` is caller-supplied and untrusted; the verifier distinguishes it using `reference_matched` internally.
- No storage, network, DOM, arbitrary JavaScript execution, installation, Frozen access, product loading or changes to the main app.
- Test: `node --test eval/tests/genesis-x-verified-chain.test.mjs`. Tests include tampered arithmetic, tampered logic, reordering and missing verifier.
- Stacked on 0.6. Must pass GitHub CI and code review before any main release.

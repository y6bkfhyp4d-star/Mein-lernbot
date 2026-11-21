# GENESIS X 0.6 – independent execution verification experiment

- `modules/genesis-x-verifier.js` exports `window.NERYXGenesisXVerifier.verify({program,rule,cases,claims})`.
- The caller supplies the program/rule and reported case outputs. Version 0.5 does **not** expose those candidate artifacts, so this verifier is **not yet wired into the 0.5 chain**. Do not imply automated end-to-end verification.
- This module separately evaluates the numeric operations and logic AST, then compares each claimed value and decision. Mismatches identify `numeric` or `logic` and a zero-based case index.
- Optional `cases[].truth` references permit a separate reference comparison, but **reference data are supplied by the caller**, not trusted external ground truth.
- Outcomes: `execution_matched`, `reference_matched`, `mismatch`, `reference_mismatch`, `invalid`. No `verified` or universally correct label.
- The module is read-only, bounded to 20 examples and 3 numeric instructions, and refuses unknown instructions or malformed Boolean rules.
- No network, DOM, storage, eval, self-installation, production integration or Frozen access.
- Test: `node --test eval/tests/genesis-x-verifier.test.mjs`.
- The experiment is stacked on `neryx/genesis-x-05-chain`; do not merge to main automatically.

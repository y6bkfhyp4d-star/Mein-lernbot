# GENESIS X 1.0 — C sparse array repair

Research-only, stacked on `neryx/genesis-x-10-fix-dependencies-b2`.

## Problem
`Array.prototype.some` skips empty array slots. `genesis-x-chain.js` consequently accepted sparse `task.cases` through input validation, then iterated the missing element as `undefined` and threw a TypeError. The verified chain also used `some`, so it did not reject sparse inputs at its boundary.

## Fix
Both `genesis-x-chain.js` and `genesis-x-verified-chain.js` validate every position via `Array.from(...)` before evaluation. This materializes missing entries as `undefined`, which is rejected as `invalid`. The preexisting case count limit (1–20) remains intact.

## Scope & verification
- Test dense valid inputs plus all holes, leading, middle and trailing holes, explicit undefined and a sparse 20-item array.
- Run the original reproduction test C; previously fixed A/B/B2/H cases; and all 0.1–1.0 module regression suites.
- Intentionally leave D (truth leaking into selection diagnostics) unresolved; that red test must remain excluded until its dedicated repair.
- No storage, app entrypoint, main or Frozen changes. No claims about arbitrary Proxy objects or hostile getters; those require separate input hardening.

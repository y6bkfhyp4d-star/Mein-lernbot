# GENESIS X 0.8 — conservative diagnosis and candidate suggestion

This is an **isolated research experiment**, not autonomous self-improvement.

- `modules/genesis-x-diagnostics.js` exports `window.NERYXGenesisXDiagnostics.diagnose(task)`.
- Calls the 0.7 verified chain once as baseline. If already `execution_checked`: `no_change`.
- If blocked by an audit, returns `blocked` with available stage information. **Never** treats a failed verifier as permission to modify rules.
- If unconfirmed, tries exactly one bounded variation: adding constants from the fixed list `[0,1,2,3,4,5,10]` (maximum 8 unique constants).
- A suggestion is returned **only** if the complete 0.7 verification passes on the trial. Nothing is installed, stored, or applied.
- The supplied validation and claimed references are developer-known and untrusted. A suggestion is not proof of a correct real-world rule or generalization.
- It never changes `maxSteps`, rules, user data, code, or Frozen files. No network, DOM, eval, installation, or production hookup.
- Tests: `node --test eval/tests/genesis-x-diagnostics.test.mjs`.
- Separate stacked branch from 0.7; manual review and more independent validation required before product integration.

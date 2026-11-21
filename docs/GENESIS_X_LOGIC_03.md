# GENESIS X 0.3 – bounded logic lab

This is an **isolated research prototype**, not a generalized reasoning engine.

- `modules/genesis-x-logic.js`: `window.NERYXGenesisXLogic.learn({training,validation,constants})`.
- Each example is `{a:number,b:number,expected:boolean}`; identifiers must not overlap between training and validation.
- Allowed predicates: `gt`, `lt`, `eq` on `a`, `b`, or an explicit constant; compositions: `not`, `and`, `or`.
- Only a single predicate, its negation, or a composition of two literals is searched; 5000 candidate evaluation cap.
- A candidate must agree with every training and validation sample. A *separate* test-side evaluator rechecks it against additional pairs. Validation is used during model selection, so it is **not** a hidden final test.
- No code generation/execution, network, storage, DOM, self-install or modification of the main app. No Frozen suite access.
- Tests: `node --test eval/tests/genesis-x-logic.test.mjs`.
- Branch is based on `neryx/genesis-x-02-tools`; **do not merge into main** before separate CI, review, and explicit release approval.

The system learns finite Boolean decision rules only. A matching rule does **not** prove a causal, semantic or universally applicable inference.

# GENESIS X 0.4 – Isolated typed task router

**Status: experimental routing, not general natural-language problem understanding.**

- `modules/genesis-x-router.js` exports `window.NERYXGenesisXRouter.classify(task)` and `solve(task)`.
- Numerics use explicit `{x:number,y:number}` samples and route to `NERYXGenesisXTools.compose` (0.2).
- Boolean logic uses explicit `{a:number,b:number,expected:boolean}` samples and routes to `NERYXGenesisXLogic.learn` (0.3).
- The caller supplies `training` and `validation`; validation is involved in selection and is **not** an external hidden audit. There is no language-model-based intent detection.
- Unsupported, mixed, or contradictory schemas fail closed; missing engines return `unavailable`; errors and malformed engine statuses return `unconfirmed`.
- The router has **no access to user data**, cannot install programs, and does not modify the existing application. Frozen artifacts remain unchanged.
- This branch is stacked on `neryx/genesis-x-03-logic`. Do not merge directly into `main` or enable this in the product without separate verification and explicit release approval.
- Test: `node --test eval/tests/genesis-x-router.test.mjs`.

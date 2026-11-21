# GENESIS X 1.0 — integrated research facade

Status: **experimental, no product integration and no release approval**.

This version unifies the interfaces of nine isolated GENESIS X labs without modifying them. It is **not a new standalone AI model**.

## Entry point

`modules/genesis-x-research-lab.js` exports `window.NERYXGenesisXResearchLab`:

- `capabilities()`: read-only list of nine expected versions and presence checks
- `run({mode,input})`: dispatches one structured request to the selected lab
- `modes`: `strategy` (0.1), `numeric` (0.2), `logic` (0.3), `routing` (0.4), `chain` (0.5), `audit` (0.6), `checked` (0.7), `diagnosis` (0.8), `research` (0.9)

The facade rejects unknown modes, missing modules, version mismatches, exceptions and unrecognized result statuses. It passes through each existing module's own status; a `candidate` result is **not** converted to a verification claim.

## Constraints

- No changes to `app.js`, `index.html`, `sw.js`, earlier GENESIS X labs, persisted user data, or Frozen artifacts.
- No network, DOM, storage, eval, arbitrary source code, installation or auto-promotion.
- `research` expects `{task,audit}` and treats caller-provided audit references as untrusted. No hidden independent benchmark has been conducted.
- Neither natural-language understanding nor universal validity is established.
- Node testing: `node --test eval/tests/genesis-x-research-lab.test.mjs`.
- This branch is stacked on `neryx/genesis-x-09-research-cycle`. CI, external review and explicit release approval are necessary before any use in the main app.

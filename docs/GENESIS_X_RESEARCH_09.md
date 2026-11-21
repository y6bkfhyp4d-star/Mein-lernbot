# GENESIS X 0.9 – isolated research loop

Status: **read-only experimental hypothesis comparison, not autonomous self-improvement**.

- `modules/genesis-x-research.js` exports `window.NERYXGenesisXResearch.run({task,audit})`.
- The existing 0.8 diagnostics proposes at most one bounded variation to the numeric constant list. The hypothesis selector sees **only `task`**.
- An additional `audit` of 3–20 pairs `{x,b,truth:{value,decision}}` must be unique and use x-values absent from numeric training, numeric validation and the original selection cases.
- The research loop compares the baseline and candidate on **the same supplied audit set**. A candidate must match **every supplied reference**, via the separate 0.6 interpreter and the 0.7 fail-closed wrapper.
- Output `coverage_gain_observed` is permitted only when the baseline abstained and the candidate matched all supplied references. This is a **coverage gain on this set**, not proven improved accuracy.
- Reject unsuccessful proposals; block malformed or suspicious evaluations. No automatic promotion, installation, persistence, code changes, network, DOM, or access to Frozen files.
- The caller supplies all reference truths. This is **not** a trusted secret external holdout or proof of worldwide novelty.
- Test: `node --test eval/tests/genesis-x-research.test.mjs`.
- Stacked on 0.8; CI and further review are required before changing `main`.

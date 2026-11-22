# GENESIS X 1.0 – Stacked branch and current-main integration audit

Date: 2026-11-22. **Audit-only Draft PR** stacked onto `neryx/genesis-x-10-null-sparse-hardening` (PR #38). No implementation module changes in this audit. Latest repaired source commit in parent: `df564bdc9cb1da99ce433caf6261355e68f86b1d`.

## Verified GitHub repository facts

Pull requests #29–#38 form an exact linear base/head chain, are open drafts, not merged, and GitHub reported them mergeable against their immediate stacked bases at the time checked. Earlier GENESIS X 0.2–1.0 stages are also stacked upstream (PR #19–#27); #28 is a docs-only architecture review. **Immediate-branch mergeability is not evidence that the entire stack merges safely to the current main.**

At audit start the GitHub compare `main...neryx/genesis-x-10-null-sparse-hardening` returned:
- status `diverged`
- 104 commits ahead, 21 commits behind
- merge base `859b6425992f5c06543390e3199d253e64f7d905`
- research and tests/workflows/docs changed; no production `app.js`, `index.html`, `sw.js`, Frozen seal in the compare file list.

The latest GENESIS X branch-specific CI https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45008401701 passed **157/157** tests. Its command ran `node --test eval/tests/genesis-x*.test.mjs`, **not** the entire app/corpus evaluation set.

The default branch already has a more extensive merge gate (`.github/workflows/neryx-merge-verification.yml`) with all corpus/evaluation tests and real Chromium/WebKit offline smoke tests; **none of those browser checks has been demonstrated for the complete experimental GENESIS X overlay**.

## This audit's extra checks

CI `.github/workflows/neryx-genesis-x-10-stack-integration-audit.yml` contains two independent jobs:

1. **Research full suite:** `node --test eval/tests/*.test.mjs eval/tests/corpus/*.test.mjs tests/*.test.mjs` on the full research branch.
2. **Disposable main overlay:** create a detached worktree at **current** `origin/main`, copy *only* `modules/genesis-x*.js` and `eval/tests/genesis-x*.test.mjs` from the research branch over matching paths, then run the same full test corpus. This is a temporary working tree inside GitHub Actions, **not** a GitHub merge, PR rebase, file upload to main, or production deployment.

The overlay tests source-level coexistence and non-browser Node regression behavior. It does not exercise a true Git merge conflict resolution, production wiring, web service workers, iOS compatibility, or sealed independent benchmarking. A separate real browser CI on an eventual controlled merge candidate is still required.

## Threat-model caveats

- Same-page global JS can impersonate correctly versioned components; candidate provenance control assumes the Router and Verifier are not themselves replaced.
- Audit ledger is in-memory and can be reset by reloading, creating a new session, or bypassing the facade. Caller-supplied audit labels are not independently trusted. `coverage_gain_observed` measures supplied-example coverage only.
- The 1.0 facade exposes research engine reports through modes other than chain. `publishable:false` is policy metadata, not an enforced capability boundary. Low-level `window` APIs remain available.
- The evaluators share arithmetic and logical semantics and can share bugs. The existing strict floating-point equality policy may not match user expectations.
- Neither a new independent sealed benchmark nor a real device performance test has been run.

## Release decision

**Research-only: continue. Production merge: BLOCKED.** A green experimental CI result cannot replace independent external evaluation, complete synthetic merge testing (including browsers), explicit review of release adapter boundaries, and deliberate approval. No merge or deploy is authorized by this audit.

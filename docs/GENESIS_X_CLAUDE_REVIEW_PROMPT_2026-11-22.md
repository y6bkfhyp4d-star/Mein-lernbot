# Claude review assignment — GENESIS X 1.0 (copy/paste)

You are an independent critical software architect and security reviewer. Do not implement or modify anything until you have completed the review.

Repository: https://github.com/y6bkfhyp4d-star/Mein-lernbot
Review exact branch: `neryx/genesis-x-10-research-integration`, commit `4e0dff528192f2d5a7e1df5a3f68e159c05f8208`.
Review additional report: `docs/GENESIS_X_ARCHITECTURE_REVIEW_2026-11-22.md` on branch `neryx/genesis-x-10-architecture-review`.
Important: production `main` is separate. GENESIS X 0.1–1.0 experiments are stacked, not approved for merge. No developer-known Frozen material should be used as an independent holdout.

Tasks:
1. Read all `modules/genesis-x*.js`, all matching `eval/tests/genesis-x*.test.mjs`, relevant docs, CI workflows and integration boundaries. Verify the current commit before conclusions.
2. Critically confirm/refute each P0/P1 claim in the architecture review with precise file/line references, direct input payload and observable result. Discover additional serious issues if present.
3. Pay special attention to unchecked mode exposure, mismatches between chain solution and reconstructed AST, replaced window globals, status spoofing, accidental truth leakage, tainted holdouts, inconsistent validators, boundedness and data mutation.
4. Distinguish (a) execution agreement, (b) holdout coverage, (c) predictive accuracy, (d) external generalization. Do not call the system a novel universal AI.
5. Propose the smallest viable patch set, tests first, focused and non-breaking. No autonomous updates, network activity, storage access or changes to the live app.
6. Give an honest verdict: BLOCK / CONDITIONAL / READY for experiment-only continuation, and separately BLOCK / READY for production merge. Do not claim tests ran unless you actually executed them.

Format:
- Findings ranked severity with evidence and exploit/reproduction instructions.
- Potential false positives or caveats.
- Concrete changes and test cases.
- Test commands and exact results only if run.
- Release gate recommendation.

If repository access fails, explicitly say so; do not fabricate a review. Ask for the necessary source files rather than guessing.

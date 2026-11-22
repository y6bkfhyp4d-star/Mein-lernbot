# GENESIS X – adversarial holdout evaluation (research only)

**22 November 2026 — after #49 — no production merge/deploy.**

## Why this test

The prior oracle audit #49 compared 12 publicly-known x/b examples against a separate deterministic reference for the task **y = x + 2**, **decision = y > b**. The new challenge tests whether the selected rule keeps matching when inputs are shifted or when inequalities hit precise boundaries.

## What changed

Only isolated evaluation fixtures, runner, tests, documentation and CI were added:

- `eval/genesis-x-adversarial-fixtures.mjs`: 3 **public** 10-case cohorts (comparison thresholds, signed binary fractions, distribution shift with large positive/negative values). Inputs are x and b; no answer values or truth are exposed to the engine.
- `eval/genesis-x-adversarial-holdout.mjs`: runs the original GENESIS X engine in Node VM with prohibited network/storage, learned from different positive, negative, and shifted training ranges. It receives only the new input pairs. Only **after** the engine generates claims, the independent oracle from #49 evaluates each case.
- Every cohort also injects a false numeric prediction and a flipped Boolean decision, verifying the independent checker fails closed.
- `eval/tests/genesis-x-adversarial-holdout.test.mjs`: coverage and boundary assertions, corruption/reordering/sparse-result detection and nonpublication.
- CI runs the challenge audit, the previous oracle audit, all Node regressions, and a protected-files check.

The output is only **aggregated audit statistics**. The test protocol stays `publishable:false`. No app or GENESIS X engine code was modified.

## Evidence boundaries

This is a fixed public holdout, **not sealed independent validation**. It measures robustness on this *known task family* rather than proof of generalized reasoning or skill with novel operators. Boundary values are chosen from an explicitly known formula and can still share specification errors with the implementation. No real iPhone browser test or Vercel preview is implied.

A failure is recorded rather than modifying the fixture to force a green result. Product integration and live release remain blocked.

## Verified CI results (2026-11-22)

[GitHub Actions #45013701653](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45013701653): **3/3 green jobs**.

- New adversarial public holdouts: **30/30 correct** (10/10 comparison boundaries; 10/10 signed fractions; 10/10 large input distribution-shift); **30/30 numeric values** and **30/30 Boolean decisions** matched the independent deterministic specification.
- Each cohort's intentionally wrong numeric value and flipped Boolean claim produced a **reference mismatch** rather than an accepted result.
- Re-run of #49's earlier public oracle test: **12/12 matched**.
- Complete Node regression corpus: **605/605 passed**, 0 failures.
- Production and research engine protection check: passed. All outputs retain `publishable:false`.

**Interpretation:** Robust on these 30 *public, finite, formula-known* cases. Still not a blind sealed test or generalization to new reasoning domains. No changes to `main`, the live app, or the iPhone's data.

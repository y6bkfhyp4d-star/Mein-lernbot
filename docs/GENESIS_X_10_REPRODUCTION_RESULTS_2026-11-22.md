# GENESIS X 1.0 — original-engine red-first CI results

Branch: `neryx/genesis-x-10-repro-audit`.
Base commit: `4e0dff528192f2d5a7e1df5a3f68e159c05f8208`.
Source CI: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45005577135
Run date: 2026-11-22.

**Result:** 10 tests, **4 passed, 6 failed**, with deliberate red-first security assertions. All baseline numerical and Boolean engines loaded from original JS files, not replaced with stubs. Targeted dependency substitution in B/B2/E/H was intentional to demonstrate integration contract failure.

| Test | CI | What it demonstrates |
|---|---|---|
| Control: real disjoint training/validation and checked chain | PASS | Fixtures valid and real modules can solve them |
| A: unchecked chain result through facade | FAIL as expected | `candidate` with `report.cases` is exposed |
| B: fabricated `execution_checked` in chain mode | FAIL as expected | Global all-mode status union is insufficient |
| B2: versionless router substitution | FAIL as expected | Verified chain trusts `solve()` without a router version |
| C: sparse cases | FAIL as expected | Throws TypeError instead of returning `invalid` |
| D: truth in selection cases | FAIL as expected | Diagnostics does not reject supplied truth labels |
| E: Float equality control | PASS | Both chain and verifier use strict eq; disagreeing reference blocks |
| H: different, extensionally equal candidate | FAIL as expected | Reconstructed equivalent program accepted despite distinct provenance |
| F: overlapping numeric x audit | PASS | Already rejected correctly |
| G: fixed constants hypothesis | PASS | 0.8 only expands predefined bounded constants |

## Interpretation and priority

1. **High design priority:** Separate exploration mode from user-facing checked output. Introduce per-mode result schemas, not merely a global status union (A/B).
2. **High correctness priority:** Preserve the exact candidate program/logic artifact and validate its identity without reconstructing after evaluation (H).
3. **Medium:** Reject labels from selection inputs or establish an explicit reference-data contract (D).
4. **Medium integration integrity:** Check pinned dependencies and versions for fail-closed behavior. A replacement global presupposes execution in the same page; not by itself a remote-exploitation claim (B2).
5. **Low:** Return `invalid` on sparse arrays without throwing (C).

No code fixes have yet been applied. CI is **intentionally red**, not a passing release gate. No production app, previous lab module, or Frozen file changed. Do not merge or activate in main.

Next: repair the facade and provenance contract on a separate draft branch; preserve the original red-first tests and run all existing regressions after each small patch. Consider an independent reviewer before production deployment.

# GENESIS X 1.0 — red-first reproduction pack

Reproduce Claude's findings **with real 0.1–0.9 modules** (no Tools/Logic stubs); source commit baseline `4e0dff528192f2d5a7e1df5a3f68e159c05f8208`. All numeric and Boolean fixture validation sets are disjoint from their training rows. Every expected-to-fail assertion is explicitly labeled `/ RED`.

Run:
`node --test eval/tests/genesis-x-10-reproduction.test.mjs`

## Interpretation
- A: unverified `chain` output exposed. This is a **facade API design risk**, not proof of production exposure.
- B: spoofed status via an injected chain module accepted by generic cross-mode status union.
- B2: an injected versionless router reaches `execution_checked`. This requires replacing a JS global; not a remote exploit by itself.
- C: sparse `cases` arrays throw instead of returning `invalid`.
- D: selection cases with `truth` are not explicitly rejected by the diagnosis input schema.
- E (characterization, expected green): both chain and verifier currently implement exact floating-point equality for `eq`. A caller reference that disagrees blocks the prediction. Not a claim that the semantic choice is a software vulnerability.
- H: a wrapped **real router** substitutes an extensionally identical but structurally different program during the second invocation. The expected red assertion requires binding the actual candidate artifact, not just matching case outputs.
- F (characterization, expected green): overlapping numeric x is already rejected. Overlap on only a logic feature value is not independently evidence of leakage; don't demand arbitrary invalidation without defining a formal dataset policy.
- G (characterization, expected green): 0.8 only tries the fixed list `[0,1,2,3,4,5,10]`.

The intentionally red tests are expected to fail on this untouched experimental branch. A failed test run here is **evidence of a reproduced issue**, not a green release gate. If any green control fails, inspect the fixture/tests before drawing conclusions.

No product code, Frozen, earlier module, or user-data changes. Do not merge as-is. Confirm all red failures and control passes from CI logs, then repair one defect family at a time on separate branches.

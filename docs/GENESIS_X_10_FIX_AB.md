# GENESIS X 1.0 — targeted facade repair A/B

Branch `neryx/genesis-x-10-fix-facade-ab`, stacked on the original-engine red-first reproduction branch.

## Contract

- This is a **research-only** API. Every facade response is non-publishable, including `checked` and `audit`.
- `chain` (0.5) is **never allowed to return case predictions** via the facade. Even with a candidate, facade returns `status: 'exploration_only'`, `candidateStatus`, and `publishable:false`, without the engine's `report`.
- Mode-specific allowed statuses replace the global union. `chain` reporting `execution_checked` is blocked. A deliberate version spoof with the same claimed string remains outside this specific fix; B2/version pinning is separate.
- Other modes preserve their research reports for experiments; no mode in this facade constitutes production answer approval.
- This is a breaking behavior change for research consumers of `chain`; no product consumer has been established. Original 1.0 integration tests now assert the new expected behavior.

## Verification

- Run all existing GENESIS X regression tests (0.1–1.0).
- Run *only* red-first tests A and B plus their green controls, requiring them now to pass. B2/C/D/H are deliberately excluded from this targeted green job because they need separate repair steps.
- Future release gates must separately solve H (provenance), B2 (dependency pinning), C (sparse arrays), D (selection truth), and verify there is no direct production import of raw experimental modules.
- No app entrypoint, storage, Frozen evaluation or previous GENESIS X engine modified.

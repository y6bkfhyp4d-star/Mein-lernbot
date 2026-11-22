# GENESIS X 1.0 — B2 dependency contract repair

Research-only stacked branch `neryx/genesis-x-10-fix-dependencies-b2` based on H provenance repair.

## Changes
- 0.4 typed router requires numeric engine 0.2 or logic engine 0.3.
- 0.5 chain requires router 0.4.
- 0.7 verified chain requires chain 0.5 and verifier 0.6.
- 0.8 diagnostics requires verified chain 0.7.
- 0.9 research requires diagnostics 0.8 and verified chain 0.7.
- Old fault-injection fixtures explicitly supply matching version metadata when their intent is to test a *different* failure.

All mismatched, absent, or versionless dependencies refuse operation. Tests check both genuine execution and missing/wrong versions at each boundary. The facade itself already checks its selected top-level engine version.

## Security limitation
Version strings only detect accidental incompatibilities and basic replacement mistakes. A compromised script can claim the correct version, or replace multiple globals; this patch cannot establish cryptographic integrity or protect a fully compromised browser environment. The claim is **dependency fail-closed**, not a proof of trusted code provenance.

Other findings remain: C (sparse arrays), D (selection truths). No production deployment, Frozen changes or auto-updates.

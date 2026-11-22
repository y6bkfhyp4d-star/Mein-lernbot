# GENESIS X 1.0 — experimental audit reuse ledger

**Research-only branch** `neryx/genesis-x-10-audit-ledger-session`, stacked on H selection fix #36.

## Threat and implementation

The original 0.9 `run({task,audit})` accepts the same audit data repeatedly. A caller could report multiple successes from exactly the same cases, falsely implying fresh independent evaluation. An in-memory **session ledger** now tracks each audit x used for a completed, evidence-bearing comparison and blocks its reuse within that session.

- `NERYXGenesisXResearch.createSession()` returns `{run(request), summary()}` with private `Set` and maximum **32** recorded evaluations; max audit cases 20 remains in place.
- Exact, reordered, cloned and relabeled audit examples reuse the same numeric x and are rejected. Even partial overlap blocks the whole new batch.
- Inputs that produce `invalid` or `no_change` without actual audit comparison do not consume evidence. Only results reporting a complete `auditCount` consume the x values, including rejected hypotheses.
- `NERYXGenesisXResearchLab.run({mode:'research', input:{task,audit}})` uses one shared private ledger session per facade instance, and refuses a silent module replacement that might reset its history.
- The original low-level `NERYXGenesisXResearch.run(...)` remains available for legacy experiments, but **does not enforce reuse detection**. Do not use that function to claim fresh independent evidence.

## Explicit limits

- The ledger is **in-memory only** and is lost when the page is reloaded. Separate sessions do not share history. No localStorage, network, file access or persistence is introduced.
- The ledger is **not a sealed holdout benchmark**; it does not prevent a malicious caller from knowing/altering truths, keeping copies, creating new sessions, or repeatedly tuning on audit failures.
- Audit sets are de-duplicated by numeric x only. This is deliberately stricter than x/b equality, because different truth labels or b values do not make previously exposed x fresh.
- Audit outcomes still support `coverage_gain_observed`, not measured broad generalization. Caller-provided truth remains untrusted.
- `max 32` is a bounded experiment-session budget, not a statistically derived independence standard.

## Verify

Run `node --test eval/tests/genesis-x*.test.mjs`. Tests cover original engines, A/B/B2/C/D/H findings, manipulation protection, the ledger itself, facade reuse, disjoint sets, partial overlap, copied/reordered/relabeled cases, budget and state limits. A green test suite is not release authorization.

No main merge, production app, user data, Frozen evaluation or auto-promotion.

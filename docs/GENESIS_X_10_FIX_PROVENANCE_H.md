# GENESIS X 1.0 – H candidate provenance repair

Stacked research-only repair over `neryx/genesis-x-10-fix-facade-ab`.

## Problem

Previously, `genesis-x-verified-chain.js` called the deterministic router **again** after `genesis-x-chain.js` had selected and evaluated a program. Two different programs could agree on the observed cases, so the independent verifier would accept outputs using the second program rather than the actual selected artifact.

## Change

- `genesis-x-chain.js` snapshots selected `program` and `rule` before computing cases; returns `artifacts:{program,rule}` alongside its **unverified** candidate results.
- `genesis-x-verified-chain.js` consumes exactly those artifacts and uses the separate 0.6 interpreter to check the corresponding numerical/Boolean claims.
- The verifier **no longer reruns** the router after the chain produces outputs.
- Missing/malformed artifacts and altered programs that disagree with outputs are blocked.
- The 1.0 facade from A/B still refuses to expose unverified chain results to callers.

## Limits

This is an **identity/provenance handoff inside a single execution**, not a cryptographic chain of custody or a sandbox security boundary. A malicious same-page script that controls the chain implementation can fabricate matching output and artifacts; no code-level API can establish trust against fully compromised JavaScript globals.

Matching calculations only proves execution agreement with selected rules, **not that those rules are true**.

This patch does not address B2 dependency pinning, C sparse arrays, D truth labels, or independent benchmarks. Keep unmerged, with full regression tests.

# GENESIS X 1.0 — H independent selector repair

Stacked on the final audit branch, experimental only.

## Reproduced concern
A fabricated 0.5 Chain can provide internally consistent `artifacts` and `cases` for a *different* rule (e.g. multiply by two) than the numeric rule selected by the original 0.4 Router (add two). A verifier that consumes only the self-reported chain artifacts would return `execution_checked`. That is an artifact-origin failure, not proof of remote code execution.

## Revised dataflow
1. 0.7 Verified Chain invokes Router 0.4 **once for each component** and copies its selected `program` and `rule` before invoking the Chain.
2. Verified Chain calls `Chain.solve(task, selected)`, passing **copies** of the orchestrator's selection. This supports correct one-pass predictions without another router call.
3. Verified Chain rejects any Chain output whose returned artifacts do not structurally match the orchestrator's selection, even if predicted results happen to agree.
4. The separate 0.6 Verifier independently recalculates all claims against the **orchestrator-selected artifacts**, not against artifacts declared by Chain.
5. Direct `Chain.solve(task)` remains a research-only exploratory API. The 1.0 facade continues to hide its unverified case outputs.

No unkeyed hash is claimed to protect untrusted data; a checksum computed by a malicious Chain would be just as malleable as the results. JSON serialization is used here only as a bounded structural comparison of selected rule objects, not as cryptographic trust.

## Limits
- All modules are JavaScript globals. A hostile same-page script able to replace Router, Chain and Verifier can evade these local contracts; this work protects **against a replaced Chain** when Router and Verifier are intact, not an arbitrarily compromised page.
- The selection itself is learned from developer-supplied training and validation data and can be wrong. `execution_checked` means execution agreement, not general-world truth.
- No release authorization, Frozen evaluation, product integration, or automatic merge.
- The remaining independent-review findings (audit reuse, null inputs, copied interpreters, public research globals, browser tests) are separate next steps.

# NERYX reviewer trust contract

Status: proposed; not an enforced merge policy. This document does not grant approval.

## Trust boundaries
- The static reviewer must check out the immutable pull-request base SHA, with persistent credentials disabled. PR files are data fetched through the read-only GitHub API.
- The static job must have only contents: read and pull-requests: read, no external AI key, and no execution of analyzed source. Retain the 30-file and diff-size limits.
- The manual Gemini job remains separate and restricted to workflow_dispatch on main.
- A pull_request workflow definition itself can be changed by a PR. Base checkout does not establish trust in that definition. Candidate CI success is not proof of independent enforcement.
- The existing base-owned trusted candidate path gate protects automatic candidate branches, not all ordinary PRs.

## Release checklist
1. Independently inspect the exact base and head SHA and complete diff, including renamed/deleted paths.
2. For changes to workflows, reviewer scripts/tests, CODEOWNERS or repository security policy, obtain review outside the candidate-controlled workflow. Do not treat a self-authored approval or green candidate job as independent review.
3. Verify read-only permissions, pinned checkout action, exact base SHA checkout, disabled persistent credentials, bounded API inputs, and separation of the manual secret-bearing job.
4. Verify the current head's CI results. Repeat review when the head or relevant base changes.
5. Keep draft status until review and acceptance are complete. No automatic merge.
6. Repository administrator: independently evaluate a required trusted workflow or required independent approval with stale-review dismissal. Check that a second eligible reviewer is actually available before enabling an approval requirement. Do not weaken existing required checks or add bypass actors.

## Known limitations
The active default-branch ruleset observed on 2026-11-28 requires pull requests and five checks but zero approving reviews. The connector does not expose ruleset writes. Therefore this contract is documentation, not technical enforcement. PR #98's base checkout change only becomes active on main after a reviewed merge. Ordinary PR integration tests intentionally execute candidate application/test code in unprivileged jobs; these are not the static reviewer.

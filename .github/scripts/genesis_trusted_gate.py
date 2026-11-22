#!/usr/bin/env python3
"""Read-only trusted-base PR policy. NEVER fetch or execute PR-head source."""
import base64
import binascii
import json
import os
import sys
import urllib.parse
import urllib.request
from genesis_candidate_schema import validate_candidate_bytes

CANDIDATE_DIRS = ("candidates/", "eval/candidates/")
# Only JSON candidate data and Markdown docs get a review exemption.
# A filename extension is not proof of harmless content; consumers must never execute it.
DOCS_DIR = "docs/"


def valid_path(path):
    return (
        isinstance(path, str) and bool(path) and not path.startswith("/")
        and "\\" not in path and "\x00" not in path
        and all(p not in ("", ".", "..") for p in path.split("/"))
        and not any(ord(c) < 32 or ord(c) == 127 for c in path)
    )


def candidate_data(path):
    return path.endswith(".json") and any(
        path.startswith(prefix) for prefix in CANDIDATE_DIRS
    )


def review_exempt(path):
    return candidate_data(path) or (
        path.startswith(DOCS_DIR) and path.endswith(".md")
    )


def sensitive(path):
    return not review_exempt(path)


def native_review_enforced(ruleset, repository):
    """Confirm GitHub itself enforces the live review state at merge time."""
    if not isinstance(ruleset, dict) or ruleset.get("enforcement") != "active":
        return False
    if ruleset.get("source") != repository or ruleset.get("target") != "branch":
        return False
    if ruleset.get("bypass_actors") != []:
        return False
    conditions = ruleset.get("conditions")
    if not isinstance(conditions, dict):
        return False
    names = conditions.get("ref_name")
    if not isinstance(names, dict) or "~DEFAULT_BRANCH" not in names.get("include", []):
        return False
    if names.get("exclude"):
        return False
    review_policy = None
    status_policy = None
    for rule in ruleset.get("rules", []):
        if not isinstance(rule, dict):
            return False
        if rule.get("type") == "pull_request":
            review_policy = rule.get("parameters")
        if rule.get("type") == "required_status_checks":
            status_policy = rule.get("parameters")
    if not isinstance(review_policy, dict) or not isinstance(status_policy, dict):
        return False
    count = review_policy.get("required_approving_review_count")
    if type(count) is not int or count < 1:
        return False
    if review_policy.get("dismiss_stale_reviews_on_push") is not True:
        return False
    checks = status_policy.get("required_status_checks")
    if not isinstance(checks, list) or not any(
        isinstance(item, dict) and item.get("context") == "genesis-candidate-paths-trusted"
        and item.get("integration_id") == 15368 for item in checks
    ):
        return False
    return True


def decide(head_ref, files, reviews, author, head_sha,
           native_review_protected=False):
    """Return (allowed, reason); fail closed on invalid GitHub API data."""
    if not isinstance(head_ref, str) or not head_ref:
        raise ValueError("Missing branch")
    if not isinstance(head_sha, str) or len(head_sha) != 40 or any(
        c not in "0123456789abcdef" for c in head_sha
    ):
        raise ValueError("Missing pinned head commit")
    if not isinstance(author, str) or not author:
        raise ValueError("Missing PR author")
    if not isinstance(files, list) or not 1 <= len(files) <= 3000:
        raise ValueError("Invalid PR file count")
    if not isinstance(reviews, list) or len(reviews) > 3000:
        raise ValueError("Invalid review list")
    paths = []
    for item in files:
        if not isinstance(item, dict) or not valid_path(item.get("filename")):
            raise ValueError("Invalid file entry")
        paths.append(item["filename"])
        previous = item.get("previous_filename")
        if previous is not None:
            if not valid_path(previous):
                raise ValueError("Invalid renamed path")
            paths.append(previous)
    paths = sorted(set(paths))
    if head_ref.startswith("neryx/auto/"):
        prohibited = [p for p in paths if not candidate_data(p)]
        return (False, "auto-candidate-prohibited-path") if prohibited else (
            True, "candidate-data-only"
        )

    protected = [p for p in paths if sensitive(p)]
    if not protected:
        return True, "no-sensitive-path"
    if native_review_protected is not True:
        return False, "native-review-enforcement-not-proven"
    # GitHub reviews are grouped by reviewer. The latest non-COMMENTED
    # decision must be APPROVED on this exact head commit.
    decisions = {}
    for review in reviews:
        if not isinstance(review, dict):
            raise ValueError("Invalid review entry")
        user = review.get("user")
        if not isinstance(user, dict):
            raise ValueError("Invalid reviewer")
        login = user.get("login")
        if not isinstance(login, str) or not login:
            raise ValueError("Invalid reviewer login")
        state = review.get("state")
        if state not in ("APPROVED", "CHANGES_REQUESTED", "DISMISSED", "COMMENTED", "PENDING"):
            raise ValueError("Invalid review state")
        if state in ("APPROVED", "CHANGES_REQUESTED", "DISMISSED"):
            decisions[login] = review
    for login, review in decisions.items():
        user = review["user"]
        if (login.casefold() != author.casefold()
            and user.get("type") == "User"
            and review.get("author_association") in ("OWNER", "MEMBER", "COLLABORATOR")
            and review["state"] == "APPROVED"
            and review.get("commit_id") == head_sha):
            return True, "independent-current-approval"
    return False, "sensitive-path-requires-independent-current-approval"


def get_pages(api, token, suffix):
    items = []
    for page in range(1, 32):
        url = f"{api}/{suffix}?per_page=100&page={page}"
        request = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GENESIS-X-protected-base-readonly-gate",
        })
        with urllib.request.urlopen(request, timeout=15) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise ValueError("Malformed GitHub API response")
        items.extend(batch)
        if len(items) > 3000:
            raise ValueError("Too many results")
        if len(batch) < 100:
            return items
    raise ValueError("API results exceed hard pagination limit")


def get_ruleset(api, token, repository):
    # Fail closed if native merge-time review settings are unavailable.
    url = f"{api}/repos/{repository}/rulesets/27848423"
    request = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GENESIS-X-readonly-ruleset-gate",
    })
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)


def validate_candidate_files(api, token, repository, head_sha, base_sha, files):
    """Fetch pinned blobs via read-only contents API; never execute PR code."""
    candidates = [f for f in files if candidate_data(f["filename"])]
    if len(candidates) > 20:
        raise ValueError("Too many candidate JSON files")
    for f in candidates:
        if f.get("status") not in ("added", "modified"):
            raise ValueError("Candidate deletions and renames are not allowed")
        blob_sha = f.get("sha")
        if not isinstance(blob_sha, str) or len(blob_sha) != 40 or any(
            x not in "0123456789abcdef" for x in blob_sha
        ):
            raise ValueError("Unpinned candidate blob")
        path = urllib.parse.quote(f["filename"], safe="/")
        url = f"{api}/repos/{repository}/contents/{path}?ref={head_sha}"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GENESIS-X-readonly-candidate-schema",
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.load(response)
        if not isinstance(payload, dict) or payload.get("sha") != blob_sha:
            raise ValueError("Candidate blob identity mismatch")
        if payload.get("encoding") != "base64":
            raise ValueError("Candidate content encoding unsupported")
        encoded = payload.get("content")
        if not isinstance(encoded, str) or len(encoded) > 50_000:
            raise ValueError("Candidate JSON body too large")
        try:
            raw = base64.b64decode(encoded, validate=False)
        except (ValueError, binascii.Error) as exc:
            raise ValueError("Invalid candidate base64") from exc
        report = validate_candidate_bytes(raw)
        # Bind proposal to the same protected base commit seen by this workflow.
        decoded = json.loads(raw.decode("utf-8"))
        if decoded["baseSha"] != base_sha:
            raise ValueError("Candidate proposal baseline does not match PR base")
        print(f"Validated candidate {report['id']} with {report['evidenceCount']} evidence items")


def main():
    api = os.environ["API_URL"].rstrip("/")
    repository = os.environ["REPOSITORY"]
    number = int(os.environ["PR_NUMBER"])
    token = os.environ["GH_TOKEN"]
    head = os.environ["HEAD_REF"]
    head_sha = os.environ["HEAD_SHA"]
    base_sha = os.environ["BASE_SHA"]
    author = os.environ["PR_AUTHOR"]
    if not repository or number < 1 or not token or not api.startswith("https://"):
        raise ValueError("Invalid runner configuration")
    if not isinstance(base_sha, str) or len(base_sha) != 40 or any(
        char not in "0123456789abcdef" for char in base_sha
    ):
        raise ValueError("Invalid runner configuration")
    prefix = f"repos/{repository}/pulls/{number}"
    files = get_pages(api, token, prefix + "/files")
    validate_candidate_files(api, token, repository, head_sha, base_sha, files)
    # Read only reviews; do not trust PR-controlled code, labels or comments.
    reviews = get_pages(api, token, prefix + "/reviews")
    # Native GitHub protection is a prerequisite for any sensitive-source PASS.
    # GitHub, not a potentially stale CI status, must enforce review revocations.
    rule = get_ruleset(api, token, repository)
    protected = native_review_enforced(rule, repository)
    ok, reason = decide(head, files, reviews, author, head_sha, protected)
    print(f"GENESIS trusted policy: {'PASS' if ok else 'DENY'} ({reason})")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, TypeError, OSError) as exc:
        print(f"GENESIS trusted policy failure: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1) from exc

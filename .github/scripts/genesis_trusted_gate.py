#!/usr/bin/env python3
"""Read-only trusted-base PR policy. NEVER fetch or execute PR-head source."""
import json
import os
import sys
import urllib.request

ALLOWED = ("candidates/", "eval/candidates/")
# Fail closed: only inert candidate data and ordinary docs have a review exemption.
# Any other path, including future unknown files and build/test tooling, is sensitive.
REVIEW_FREE = ("docs/", "candidates/", "eval/candidates/")


def valid_path(path):
    return (
        isinstance(path, str) and bool(path) and not path.startswith("/")
        and "\\" not in path and "\x00" not in path
        and all(p not in ("", ".", "..") for p in path.split("/"))
        and not any(ord(c) < 32 or ord(c) == 127 for c in path)
    )


def sensitive(path):
    return not any(path.startswith(prefix) for prefix in REVIEW_FREE)


def decide(head_ref, files, reviews, author, head_sha):
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
        prohibited = [p for p in paths if not p.startswith(ALLOWED)]
        return (False, "auto-candidate-prohibited-path") if prohibited else (
            True, "candidate-data-only"
        )

    protected = [p for p in paths if sensitive(p)]
    if not protected:
        return True, "no-sensitive-path"
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


def main():
    api = os.environ["API_URL"].rstrip("/")
    repository = os.environ["REPOSITORY"]
    number = int(os.environ["PR_NUMBER"])
    token = os.environ["GH_TOKEN"]
    head = os.environ["HEAD_REF"]
    head_sha = os.environ["HEAD_SHA"]
    author = os.environ["PR_AUTHOR"]
    if not repository or number < 1 or not token or not api.startswith("https://"):
        raise ValueError("Invalid runner configuration")
    prefix = f"repos/{repository}/pulls/{number}"
    files = get_pages(api, token, prefix + "/files")
    # Read only reviews; do not trust PR-controlled code, labels or comments.
    reviews = get_pages(api, token, prefix + "/reviews")
    ok, reason = decide(head, files, reviews, author, head_sha)
    print(f"GENESIS trusted policy: {'PASS' if ok else 'DENY'} ({reason})")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, TypeError, OSError) as exc:
        print(f"GENESIS trusted policy failure: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1) from exc

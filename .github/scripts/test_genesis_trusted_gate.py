"""Isolated offline regression suite; no network, no protected branch mutation."""
import unittest
from genesis_trusted_gate import decide, native_review_enforced

SHA = "a" * 40
OTHER = "b" * 40


def file(name, previous=None):
    out = {"filename": name}
    if previous is not None:
        out["previous_filename"] = previous
    return out


def review(name="reviewer", state="APPROVED", sha=SHA, kind="User",
           association="COLLABORATOR"):
    return {"user": {"login": name, "type": kind},
            "state": state, "commit_id": sha,
            "author_association": association}


def check(paths, ref="fix/change", reviews=None, native=True):
    return decide(ref, paths, reviews or [], "author", SHA,
                  native_review_protected=native)


class GateTests(unittest.TestCase):
    def test_repeatable_negative_and_positive_cases(self):
        cases = [
            ("neryx/auto/test", [file("candidates/draft.json")], [], True),
            ("neryx/auto/test", [file("eval/candidates/draft.json")], [], True),
            ("neryx/auto/test", [file("app.js")], [], False),
            ("neryx/auto/test", [file(".github/workflows/gate.yml")], [], False),
            ("neryx/auto/test", [file("vercel.json")], [], False),
            ("neryx/auto/test", [file("eval/genesis-ast/analyzer.mjs")], [], False),
            ("neryx/auto/test", [file("candidates/draft.json", "app.js")], [], False),
            ("neryx/auto/test", [file("app.js", "candidates/draft.json")], [], False),
            ("fix/change", [file("docs/readme.md")], [], True),
            ("fix/change", [file("app.js")], [], False),
            ("fix/change", [file(".github/workflows/gate.yml")], [], False),
            ("fix/change", [file("modules/core.js")], [review()], True),
            ("fix/change", [file("eval/browser-offline-smoke.mjs")], [], False),
            ("fix/change", [file("new-unknown-path.js")], [], False),
            ("fix/change", [file("evolution/safe-looking.json")], [], False),
            ("fix/change", [file("package-lock.json")], [], False),
            ("fix/change", [file("sw.js")],
             [review(association="NONE")], False),
            ("fix/change", [file("sw.js")],
             [review(association="FIRST_TIME_CONTRIBUTOR")], False),
            ("fix/change", [file("sw.js")],
             [review("AUTHOR")], False),
            ("fix/change", [file("sw.js")], [review("author")], False),
            ("fix/change", [file("sw.js")], [review(sha=OTHER)], False),
            ("fix/change", [file("sw.js")], [review(kind="Bot")], False),
            ("fix/change", [file("sw.js")],
             [review(), review(state="CHANGES_REQUESTED")], False),
            ("fix/change", [file("sw.js")],
             [review(), review(state="COMMENTED")], True),
            ("fix/change", [file("sw.js")],
             [review(), review(state="DISMISSED")], False),
        ]
        for ref, paths, reviews, expected in cases:
            for repeat in range(2):
                with self.subTest(ref=ref, paths=paths, repeat=repeat):
                    self.assertEqual(check(paths, ref, reviews)[0], expected)

    def test_regular_docs_and_candidates_only_exempt(self):
        self.assertEqual(check([file("docs/guide.md")])[0], True)
        self.assertEqual(check([file("candidates/idea.json")])[0], True)
        self.assertEqual(check([file("eval/candidates/idea.json")])[0], True)
        self.assertEqual(check([file("docs/guide.md", "new-build.js")])[0], False)
        self.assertEqual(check([file("docs/guide.md", "app.js")])[0], False)

    def test_native_github_review_gate_is_mandatory_even_after_approval(self):
        self.assertEqual(check([file("app.js")], reviews=[review()],
                               native=False),
                         (False, "native-review-enforcement-not-proven"))
        self.assertEqual(check([file("app.js")], reviews=[review()],
                               native=True),
                         (True, "independent-current-approval"))
        self.assertEqual(check([file("docs/guide.md")], native=False)[0],
                         True)

    def test_live_ruleset_must_enforce_one_current_review(self):
        repository = "y6bkfhyp4d-star/Mein-lernbot"
        fixture = {
            "enforcement": "active", "source": repository, "target": "branch",
            "bypass_actors": [],
            "conditions": {"ref_name": {"include": ["~DEFAULT_BRANCH"],
                                        "exclude": []}},
            "rules": [
                {"type": "pull_request", "parameters": {
                    "required_approving_review_count": 1,
                    "dismiss_stale_reviews_on_push": True}},
                {"type": "required_status_checks", "parameters": {
                    "required_status_checks": [{
                        "context": "genesis-candidate-paths-trusted",
                        "integration_id": 15368}]}}
            ]}
        import copy
        self.assertTrue(native_review_enforced(fixture, repository))
        changes = [
            ("enforcement", "disabled"),
            ("bypass_actors", [{"actor_id": 1}]),
            ("source", "someone/other-repo"),
            ("target", "tag"),
        ]
        for key, value in changes:
            with self.subTest(key=key):
                changed = copy.deepcopy(fixture)
                changed[key] = value
                self.assertFalse(native_review_enforced(changed, repository))
        for field, value in [("required_approving_review_count", 0),
                             ("dismiss_stale_reviews_on_push", False)]:
            changed = copy.deepcopy(fixture)
            changed["rules"][0]["parameters"][field] = value
            self.assertFalse(native_review_enforced(changed, repository))
        changed = copy.deepcopy(fixture)
        changed["rules"][1]["parameters"]["required_status_checks"] = []
        self.assertFalse(native_review_enforced(changed, repository))
        changed = copy.deepcopy(fixture)
        changed["conditions"]["ref_name"]["include"] = ["refs/heads/other"]
        self.assertFalse(native_review_enforced(changed, repository))

    def test_untrusted_names_and_renames_fail_closed(self):
        bad = ("../app.js", "candidates/../app.js", "/app.js",
               "candidates\\x.json", "candidates//x.json",
               "candidates/./x.json", "candidates/a\x00.json")
        for path in bad:
            with self.subTest(path=path):
                with self.assertRaises(ValueError):
                    check([file(path)], "neryx/auto/test")
        with self.assertRaises(ValueError):
            check([file("candidates/allowed.json", "../app.js")], "neryx/auto/test")
        self.assertEqual(check([file("candidates/allowed.json", "app.js")],
                               "neryx/auto/test")[0], False)

    def test_ordinary_review_validates_current_exact_head(self):
        self.assertEqual(check([file("index.html")], reviews=[review()]),
                         (True, "independent-current-approval"))
        self.assertEqual(check([file("index.html")], reviews=[review(sha=OTHER)]),
                         (False, "sensitive-path-requires-independent-current-approval"))

    def test_invalid_payloads_fail_closed(self):
        for records in ([], [{"wrong": "missing filename"}],
                        [{"filename": None}]):
            with self.assertRaises(ValueError):
                check(records)
        with self.assertRaises(ValueError):
            decide("fix/change", [file("app.js")], [{"state": "APPROVED"}],
                   "author", SHA, native_review_protected=True)
        with self.assertRaises(ValueError):
            decide("fix/change", [file("app.js")], [review()],
                   "author", "HEAD", native_review_protected=True)


if __name__ == "__main__":
    unittest.main()

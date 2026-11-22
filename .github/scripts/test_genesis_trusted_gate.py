"""Isolated offline regression suite; no network, no protected branch mutation."""
import unittest
from genesis_trusted_gate import decide

SHA = "a" * 40
OTHER = "b" * 40


def file(name, previous=None):
    out = {"filename": name}
    if previous is not None:
        out["previous_filename"] = previous
    return out


def review(name="reviewer", state="APPROVED", sha=SHA, kind="User"):
    return {"user": {"login": name, "type": kind},
            "state": state, "commit_id": sha}


def check(paths, ref="fix/change", reviews=None):
    return decide(ref, paths, reviews or [], "author", SHA)


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
                   "author", SHA)
        with self.assertRaises(ValueError):
            decide("fix/change", [file("app.js")], [review()],
                   "author", "HEAD")


if __name__ == "__main__":
    unittest.main()

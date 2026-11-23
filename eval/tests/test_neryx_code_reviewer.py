"""Security regression tests for NERYX read-only reviewer."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

PATH = pathlib.Path(__file__).resolve().parents[2] / ".github/scripts/neryx-code-reviewer.py"
spec = importlib.util.spec_from_file_location("neryx_code_reviewer", PATH)
reviewer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reviewer)


class ReviewerTests(unittest.TestCase):
    def test_allowed_code_patch(self):
        self.assertTrue(reviewer.eligible({"filename": "src/app.js", "status": "modified", "patch": "+function safe() {}"}))

    def test_no_secrets_sent(self):
        self.assertFalse(reviewer.eligible({"filename": "src/app.js", "status": "modified", "patch": "+api_key = 'abc'"}))
        self.assertFalse(reviewer.eligible({"filename": ".env", "status": "added", "patch": "+test=value"}))
        self.assertFalse(reviewer.eligible({"filename": "config/credentials.json", "status": "added", "patch": "+{}"}))

    def test_unreviewed_files_not_sent(self):
        for status in ("removed", "renamed", "copied"):
            self.assertFalse(reviewer.eligible({"filename": "app.js", "status": status, "patch": "+test"}))
        self.assertFalse(reviewer.eligible({"filename": "app.js", "status": "added", "patch": "+" + "x" * 5100}))

    @patch.object(reviewer, "get_json")
    def test_bound_diff_and_omitted(self, request):
        request.side_effect = [
            {"state": "open", "base": {"ref": "main"}, "head": {"sha": "a" * 40}, "changed_files": 2},
            [
                {"filename": "app.js", "status": "modified", "patch": "+let ok = 1"},
                {"filename": "config/.env", "status": "added", "patch": "+SECRET=hidden"},
            ],
        ]
        sha, diff, omitted = reviewer.fetch_diff("a/b", 94, "read-only-token")
        self.assertEqual(sha, "a" * 40)
        self.assertIn("app.js", diff)
        self.assertNotIn("SECRET=hidden", diff)
        self.assertEqual(omitted, 1)

    @patch.object(reviewer, "get_json")
    def test_invalid_pr_rejected(self, request):
        request.return_value = {"state": "closed", "base": {"ref": "main"}, "changed_files": 0}
        with self.assertRaises(ValueError):
            reviewer.fetch_diff("a/b", 94, "read-only-token")

    @patch.object(reviewer, "get_json")
    def test_too_many_files_rejected(self, request):
        request.return_value = {"state": "open", "base": {"ref": "main"}, "changed_files": 31}
        with self.assertRaises(ValueError):
            reviewer.fetch_diff("a/b", 94, "read-only-token")

    def test_patterns_are_advisory(self):
        found = [key for key, rule in reviewer.RULES.items()
                 if __import__("re").search(rule, "+eval(text)", __import__("re").M)]
        self.assertIn("Dynamische Codeausführung", found)


if __name__ == "__main__":
    unittest.main()

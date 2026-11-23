"""Negative publisher tests using a disposable local bare Git repo, never GitHub."""
import json
import os
import pathlib
import subprocess
import tempfile
import unittest

PUBLISHER = pathlib.Path(__file__).with_name("research-review-branch.sh")
BRANCH = "neryx/research-phase70"
REPORT = "evolution/phase70/knowledge.json"


def run(cwd, *args, env=None):
    return subprocess.run(args, cwd=cwd, env=env, text=True,
                          capture_output=True, timeout=20)


def git(cwd, *args):
    result = run(cwd, "git", *args)
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()


def write(root, path, data):
    target = pathlib.Path(root) / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(data, encoding="utf-8")


class IsolatedPublisherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="genesis-isolated-git-")
        self.addCleanup(self.temp.cleanup)
        root = pathlib.Path(self.temp.name)
        self.remote = root / "remote.git"
        self.work = root / "work"
        self.work.mkdir()
        git(root, "init", "--bare", "--initial-branch=main", str(self.remote))
        git(self.work, "init", "--initial-branch=main")
        git(self.work, "config", "user.email", "offline@example.invalid")
        git(self.work, "config", "user.name", "Offline Test")
        git(self.work, "remote", "add", "origin", str(self.remote))
        write(self.work, REPORT, '{"version":1}\n')
        write(self.work, "app.js", "export const stable = true;\n")
        git(self.work, "add", ".")
        git(self.work, "commit", "-m", "local baseline")
        git(self.work, "push", "origin", "main")
        self.baseline = git(self.work, "rev-parse", "HEAD")
        self.env = dict(os.environ, REPORT_BRANCH=BRANCH, REPORT_FILES=REPORT,
                        RUNNER_TEMP=str(root), GITHUB_REPOSITORY="offline/test")

    def publisher(self, mode="publish", **overrides):
        return run(self.work, "bash", str(PUBLISHER), mode,
                   env=dict(self.env, **overrides))

    def remote_ref(self, branch):
        return git(self.work, "ls-remote", "--heads", "origin",
                   "refs/heads/" + branch).split("\t")[0]

    def test_rejects_mismatched_branch_and_file_pairs_twice(self):
        cases = [
            {"REPORT_BRANCH": "main"},
            {"REPORT_BRANCH": "neryx/auto/other"},
            {"REPORT_BRANCH": "neryx/research-phase79"},
            {"REPORT_FILES": "app.js"},
            {"REPORT_FILES": "evolution/phase79/research79.json"},
            {"REPORT_FILES": REPORT + ",app.js"},
            {"REPORT_BRANCH": "neryx/research-phase70/../main"},
        ]
        for item in cases:
            for repeat in range(2):
                with self.subTest(case=item, repeat=repeat):
                    response = self.publisher(**item)
                    self.assertNotEqual(response.returncode, 0)
                    self.assertIn("allowlist mismatch", response.stderr)
                    self.assertFalse(self.remote_ref(BRANCH))
                    self.assertEqual(self.remote_ref("main"), self.baseline)

    def test_only_report_enters_local_review_branch(self):
        write(self.work, REPORT, '{"version":2}\n')
        write(self.work, "app.js", "export const compromised = true;\n")
        write(self.work, ".github/workflows/evil.yml", "name: takeover\n")
        response = self.publisher()
        self.assertEqual(response.returncode, 0, response.stderr)
        head = self.remote_ref(BRANCH)
        self.assertEqual(self.remote_ref("main"), self.baseline)
        self.assertEqual(git(self.work, "show", head + ":app.js"),
                         "export const stable = true;")
        self.assertEqual(git(self.work, "show", head + ":" + REPORT),
                         '{"version":2}')
        response = run(self.work, "git", "cat-file", "-e",
                       head + ":.github/workflows/evil.yml")
        self.assertNotEqual(response.returncode, 0)

    def test_invalid_or_oversized_json_never_pushes(self):
        for data in ('{"bad":', "x" * 2000001):
            with self.subTest(size=len(data)):
                write(self.work, REPORT, data)
                self.assertNotEqual(self.publisher().returncode, 0)
                self.assertFalse(self.remote_ref(BRANCH))
        self.assertEqual(self.remote_ref("main"), self.baseline)

    def test_rejects_stale_main_before_any_publish(self):
        other = pathlib.Path(self.temp.name) / "other"
        git(self.temp.name, "clone", str(self.remote), str(other))
        git(other, "config", "user.email", "other@example.invalid")
        git(other, "config", "user.name", "Other")
        write(other, "app.js", "export const stable = 2;\n")
        git(other, "add", ".")
        git(other, "commit", "-m", "advance main")
        git(other, "push", "origin", "main")
        write(self.work, REPORT, '{"version":3}\n')
        response = self.publisher()
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("main advanced during checkout", response.stderr)
        self.assertFalse(self.remote_ref(BRANCH))

    def test_prepare_rejects_mapping_and_preserves_newer_main(self):
        self.assertNotEqual(self.publisher("prepare", REPORT_FILES="app.js").returncode, 0)
        write(self.work, REPORT, '{"version":2}\n')
        self.assertEqual(self.publisher().returncode, 0)
        other = pathlib.Path(self.temp.name) / "other"
        git(self.temp.name, "clone", str(self.remote), str(other))
        git(other, "config", "user.email", "other@example.invalid")
        git(other, "config", "user.name", "Other")
        write(other, REPORT, '{"version":3}\n')
        git(other, "add", ".")
        git(other, "commit", "-m", "newer main report")
        git(other, "push", "origin", "main")
        git(self.work, "fetch", "origin", "main")
        git(self.work, "reset", "--hard", "origin/main")
        response = self.publisher("prepare")
        self.assertEqual(response.returncode, 0, response.stderr)
        self.assertEqual((self.work / REPORT).read_text(encoding="utf-8"),
                         '{"version":3}\n')


    def create_poisoned_review_branch(self, report_content):
        """Only the disposable local remote gets this adversarial branch."""
        git(self.work, "checkout", "-b", BRANCH)
        write(self.work, REPORT, report_content)
        write(self.work, "app.js", "export const attacker = true;\n")
        write(self.work, ".github/workflows/backdoor.yml", "name: backdoor\n")
        git(self.work, "add", ".")
        git(self.work, "commit", "-m", "untrusted old review branch")
        git(self.work, "push", "origin", BRANCH)
        git(self.work, "checkout", "main")
        git(self.work, "reset", "--hard", self.baseline)
        return self.remote_ref(BRANCH)

    def test_existing_poisoned_branch_never_imports_executable_paths(self):
        old = self.create_poisoned_review_branch('{"version":42}\n')
        for repeat in range(2):
            with self.subTest(repeat=repeat):
                response = self.publisher("prepare")
                self.assertEqual(response.returncode, 0, response.stderr)
                self.assertEqual((self.work / REPORT).read_text(encoding="utf-8"),
                                 '{"version":42}\n')
                self.assertEqual((self.work / "app.js").read_text(encoding="utf-8"),
                                 "export const stable = true;\n")
                self.assertFalse((self.work / ".github/workflows/backdoor.yml").exists())
        result = self.publisher("publish")
        self.assertEqual(result.returncode, 0, result.stderr)
        new = self.remote_ref(BRANCH)
        self.assertNotEqual(old, new)
        self.assertEqual(self.remote_ref("main"), self.baseline)
        self.assertEqual(git(self.work, "show", new + ":app.js"),
                         "export const stable = true;")
        self.assertEqual(git(self.work, "show", new + ":" + REPORT),
                         '{"version":42}')
        self.assertNotEqual(run(self.work, "git", "cat-file", "-e",
                                new + ":.github/workflows/backdoor.yml").returncode, 0)

    def test_prepare_rejects_untrusted_json_from_old_review_branch(self):
        for payload in ('{"broken":', "x" * 2000001):
            with self.subTest(size=len(payload)):
                # A fresh local bare remote per scenario avoids any GitHub writes.
                original = self.remote_ref(BRANCH)
                self.assertFalse(original)
                self.create_poisoned_review_branch(payload)
                for repeat in range(2):
                    response = self.publisher("prepare")
                    self.assertNotEqual(response.returncode, 0)
                    self.assertEqual(self.remote_ref("main"), self.baseline)
                # Delete the isolated branch before testing another malformed input.
                git(self.work, "push", "origin", "--delete", BRANCH)
                git(self.work, "branch", "-D", BRANCH)


if __name__ == "__main__":
    unittest.main()

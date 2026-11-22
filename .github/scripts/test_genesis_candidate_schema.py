"""Offline candidate contract tests; raw bytes never execute."""
import base64
import io
import hashlib
import json
import unittest
from unittest.mock import patch
from genesis_trusted_gate import validate_candidate_files
from genesis_candidate_schema import validate_candidate_bytes, MAX_BYTES

SHA = "a" * 40
HEX = "b" * 64


def proposal(**changes):
    result = {
        "schemaVersion": 1, "kind": "genesis-x-candidate",
        "id": "draft_001", "baseSha": SHA,
        "summary": "Check direct eval use",
        "rationale": "A static call should be reviewed manually",
        "risk": "medium", "evidence": [
            {"ruleId": "AST001", "sourceSha256": HEX, "note": "Source hash recorded"}
        ], "proposedChange": "Replace the call with a static parser"
    }
    result.update(changes)
    return result


def pack(value):
    return json.dumps(value, ensure_ascii=False).encode("utf-8")


class CandidateContractTests(unittest.TestCase):
    def test_valid_contract(self):
        self.assertEqual(validate_candidate_bytes(pack(proposal())),
                         {"schemaVersion": 1, "id": "draft_001",
                          "risk": "medium", "evidenceCount": 1})

    def test_wrong_fields_and_types_fail_closed(self):
        cases = [
            {}, [], None, "string", proposal(schemaVersion=True),
            proposal(schemaVersion=2), proposal(kind="javascript"),
            proposal(id="../bad"), proposal(baseSha="head"),
            proposal(risk="critical"), proposal(risk=True),
            proposal(evidence=[]), proposal(evidence="AST001"),
            proposal(evidence=[{"ruleId": "AST001", "sourceSha256": "wrong", "note": "x"}]),
            proposal(evidence=[{"ruleId": "RULE999", "sourceSha256": HEX, "note": "x"}]),
            proposal(evidence=[{"ruleId": "AST001", "sourceSha256": HEX}]),
            proposal(summary=" "), proposal(proposedChange=""),
            proposal(extra="should be rejected"),
            proposal(evidence=[{"ruleId": "AST001", "sourceSha256": HEX, "note": "x"}] * 9),
        ]
        for value in cases:
            with self.subTest(value=str(value)[:80]):
                with self.assertRaises(ValueError):
                    validate_candidate_bytes(pack(value))

    def test_duplicate_keys_malformed_utf8_and_size_fail_closed(self):
        raw = pack(proposal())
        with self.assertRaises(ValueError):
            validate_candidate_bytes(raw.replace(b'"risk": "medium"',
                                                    b'"risk": "low", "risk": "medium"'))
        for bad in [b'{"schemaVersion":NaN}', b'{', b'\xff', b'',
                    b' ' * (MAX_BYTES + 1)]:
            with self.subTest(bad=bad[:10]):
                with self.assertRaises(ValueError):
                    validate_candidate_bytes(bad)

    def test_pinned_github_content_and_blob_mismatch(self):
        from contextlib import contextmanager
        candidate = pack(proposal())
        blob = hashlib.sha1(b"blob " + str(len(candidate)).encode("ascii")
                            + b"\\0" + candidate).hexdigest()
        payload = {"sha": blob, "encoding": "base64",
                   "content": base64.b64encode(candidate).decode("ascii")}
        head = "d" * 40
        files = [{"filename": "candidates/idea.json", "status": "added",
                  "sha": blob}]
        @contextmanager
        def fake_open(request, timeout=None):
            self.assertIn("?ref=" + head, request.full_url)
            yield io.BytesIO(json.dumps(payload).encode("utf-8"))
        with patch("genesis_trusted_gate.urllib.request.urlopen", fake_open):
            validate_candidate_files("https://api.github.com", "testtoken",
                                     "owner/repo", head, SHA, files)
            with self.assertRaises(ValueError):
                validate_candidate_files("https://api.github.com", "testtoken",
                                         "owner/repo", head, "e" * 40, files)
            payload["sha"] = "f" * 40
            with self.assertRaises(ValueError):
                validate_candidate_files("https://api.github.com", "testtoken",
                                         "owner/repo", head, SHA, files)
            payload["sha"] = blob
            payload["content"] = base64.b64encode(b"{}").decode("ascii")
            with self.assertRaises(ValueError):
                validate_candidate_files("https://api.github.com", "testtoken",
                                         "owner/repo", head, SHA, files)
            payload["content"] = "not-valid-@base64"
            with self.assertRaises(ValueError):
                validate_candidate_files("https://api.github.com", "testtoken",
                                         "owner/repo", head, SHA, files)

    def test_deleted_renamed_or_unpinned_candidate_fails(self):
        kwargs = ("https://api.github.com", "token", "owner/repo",
                  "d" * 40, SHA)
        for status in ("removed", "renamed", "unknown"):
            with self.subTest(status=status):
                with self.assertRaises(ValueError):
                    validate_candidate_files(*kwargs, [{
                        "filename": "candidates/a.json", "status": status,
                        "sha": "f" * 40}])
        with self.assertRaises(ValueError):
            validate_candidate_files(*kwargs, [{
                "filename": "candidates/a.json", "status": "added",
                "sha": "bad"}])
        with self.assertRaises(ValueError):
            validate_candidate_files(*kwargs, [{
                "filename": "candidates/a.json", "status": "added",
                "sha": "f" * 40}] * 21)

    def test_source_is_inert_data_not_compiled(self):
        dangerous = "globalThis.__NEVER_EXECUTED__ = true; eval('1');"
        data = proposal(proposedChange=dangerous)
        assert validate_candidate_bytes(pack(data))["id"] == "draft_001"


if __name__ == "__main__":
    unittest.main()

"""GENESIS X: inert candidate JSON contract; validation never executes source."""
import json
import re

MAX_BYTES = 32_768
MAX_EVIDENCE = 8
SHA = re.compile(r"^[a-f0-9]{40}$")
IDENT = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
RULE = re.compile(r"^(?:AST|SEC)[0-9]{3}$")
HEX = re.compile(r"^[a-f0-9]{64}$")


def no_duplicates(pairs):
    obj = {}
    for k, v in pairs:
        if k in obj:
            raise ValueError("Duplicate JSON key")
        obj[k] = v
    return obj


def text(value, limit):
    return isinstance(value, str) and 1 <= len(value) <= limit and (
        value == value.strip()) and not any(
            ord(c) < 32 and c not in "\n\t" for c in value)


def validate_candidate_bytes(data):
    """Validate UTF-8 JSON; return sanitized counts only, never execute it."""
    if not isinstance(data, bytes) or not 1 <= len(data) <= MAX_BYTES:
        raise ValueError("Invalid candidate size")
    try:
        payload = json.loads(data.decode("utf-8"), object_pairs_hook=no_duplicates,
                             parse_constant=lambda _: (_ for _ in ()).throw(
                                 ValueError("Invalid numeric constant")))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid UTF-8/JSON") from exc
    if not isinstance(payload, dict) or set(payload) != {
        "schemaVersion", "kind", "id", "baseSha", "summary",
        "rationale", "risk", "evidence", "proposedChange"
    }:
        raise ValueError("Invalid candidate fields")
    if type(payload["schemaVersion"]) is not int or payload["schemaVersion"] != 1:
        raise ValueError("Unsupported candidate schema")
    if payload["kind"] != "genesis-x-candidate":
        raise ValueError("Unsupported candidate type")
    if not isinstance(payload["id"], str) or not IDENT.fullmatch(payload["id"]):
        raise ValueError("Invalid candidate id")
    if not isinstance(payload["baseSha"], str) or not SHA.fullmatch(payload["baseSha"]):
        raise ValueError("Missing pinned baseline")
    if not text(payload["summary"], 200) or not text(payload["rationale"], 2000):
        raise ValueError("Missing summary or rationale")
    if payload["risk"] not in ("low", "medium", "high"):
        raise ValueError("Missing valid risk")
    if not text(payload["proposedChange"], 8000):
        raise ValueError("Missing candidate suggestion")
    evidence = payload["evidence"]
    if not isinstance(evidence, list) or not 1 <= len(evidence) <= MAX_EVIDENCE:
        raise ValueError("Invalid evidence count")
    for item in evidence:
        if not isinstance(item, dict) or set(item) != {"ruleId", "sourceSha256", "note"}:
            raise ValueError("Invalid evidence fields")
        if not isinstance(item["ruleId"], str) or not RULE.fullmatch(item["ruleId"]):
            raise ValueError("Invalid rule id")
        if not isinstance(item["sourceSha256"], str) or not HEX.fullmatch(item["sourceSha256"]):
            raise ValueError("Invalid evidence SHA")
        if not text(item["note"], 500):
            raise ValueError("Invalid evidence note")
    return {"schemaVersion": 1, "id": payload["id"],
            "risk": payload["risk"], "evidenceCount": len(evidence)}

#!/usr/bin/env python3
"""Trusted, inert Python syntax check. Reads source from stdin; never executes it."""
import ast
import json
import sys

def main():
    data = sys.stdin.buffer.read(60001)
    if len(data) > 60000:
        raise ValueError("input-limit")
    try:
        source = data.decode("utf-8", errors="strict")
        ast.parse(source, filename="<untrusted-source>", mode="exec")
        result = {"parsed": True, "line": None}
    except SyntaxError as err:
        result = {"parsed": False, "line": max(1, int(err.lineno or 1))}
    except (UnicodeError, ValueError):
        result = {"parsed": False, "line": 1}
    sys.stdout.write(json.dumps(result, separators=(",", ":")))

if __name__ == "__main__":
    main()

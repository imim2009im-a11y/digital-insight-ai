#!/usr/bin/env python3
"""Validate Agent Platform Core v1 task records without external dependencies."""
from __future__ import annotations
import json, sys
from pathlib import Path

STATES = ["RECEIVED","INSPECTED","PLANNED","RISK_CHECKED","EXECUTING","VERIFYING","REVIEWING","SUCCEEDED","BLOCKED","FAILED"]
RISKS = {"low","medium","high"}
TERMINAL = {"SUCCEEDED","BLOCKED","FAILED"}

def fail(msg: str) -> None:
    raise ValueError(msg)

def validate(task: dict) -> None:
    required = {"id","objective","scope","success_criteria","risk","capabilities_required","state","evidence","blockers"}
    missing = required - task.keys()
    extra = task.keys() - required
    if missing: fail(f"missing fields: {sorted(missing)}")
    if extra: fail(f"unexpected fields: {sorted(extra)}")
    if task["risk"] not in RISKS: fail("invalid risk")
    if task["state"] not in STATES: fail("invalid state")
    if not isinstance(task["success_criteria"], list) or not task["success_criteria"]: fail("success_criteria must be non-empty")
    if len(task["capabilities_required"]) != len(set(task["capabilities_required"])): fail("duplicate capabilities")
    if task["state"] == "SUCCEEDED" and not task["evidence"]: fail("SUCCEEDED requires evidence")
    if task["state"] == "BLOCKED" and not task["blockers"]: fail("BLOCKED requires blockers")
    if task["risk"] == "high" and task["state"] in {"EXECUTING","VERIFYING","REVIEWING","SUCCEEDED"}:
        approvals = [e for e in task["evidence"] if e.get("type") == "human-approval" and e.get("result") == "approved"]
        if not approvals: fail("high-risk execution requires explicit human-approval evidence")

def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_task.py TASK.json", file=sys.stderr); return 2
    try:
        task=json.loads(Path(sys.argv[1]).read_text())
        validate(task)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"INVALID: {exc}", file=sys.stderr); return 1
    print("VALID"); return 0

if __name__ == "__main__":
    raise SystemExit(main())

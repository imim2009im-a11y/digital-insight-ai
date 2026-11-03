#!/usr/bin/env python3
"""Offline-only NightVision DAST readiness review. NEVER starts or configures a scan.

This tool checks self-attested metadata only, not account permissions, DNS,
subscription entitlement, approvals or target isolation. Prints no input values.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

TEMPLATE = Path(__file__).resolve().parents[1] / ".github" / "nightvision-staging-readiness.json"
MAX_BYTES = 16_384
REQUIRED_EXCLUSIONS = frozenset({
    "/api/run-due", "/api/publish", "/api/scheduler",
    "/admin", "/billing", "/webhooks", "/logout",
})
REQUIRED_APPROVALS = (
    "owner_authorized", "isolated_staging_verified", "synthetic_data_only",
    "nightvision_plan_quota_verified", "no_unapproved_spend",
    "rollback_and_restore_verified",
)
FIELDS = frozenset({
    "schema_version", "target_url", "target_type", "approved_hosts",
    "allowed_paths", "excluded_paths", *REQUIRED_APPROVALS,
})
PRODUCTION_HOSTS = frozenset({
    "digitalinsightai.com",
    "www.digitalinsightai.com",
    "digital-insight-publisher.onrender.com",
})


class InvalidManifest(ValueError):
    """Malformed or potentially unsafe manifest, not a scan finding."""


def unique_pairs(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for name, value in pairs:
        if name in result:
            raise InvalidManifest("duplicate_json_key")
        result[name] = value
    return result


def parse_manifest(path: Path) -> dict:
    if path.is_symlink():
        raise InvalidManifest("symlink_disallowed")
    if not path.is_file() or path.stat().st_size > MAX_BYTES:
        raise InvalidManifest("missing_or_oversized_manifest")
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle, object_pairs_hook=unique_pairs)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise InvalidManifest("unreadable_or_invalid_json") from None
    if type(data) is not dict:
        raise InvalidManifest("object_required")
    if set(data) != FIELDS or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        raise InvalidManifest("unexpected_or_missing_fields")
    return data


def _paths_are_scoped(paths: object) -> bool:
    if type(paths) is not list or not paths or len(paths) != len(set(map(str, paths))):
        return False
    return all(
        type(value) is str
        and 2 <= len(value) <= 150
        and value.startswith("/")
        and not value.startswith("//")
        and not any(s in value for s in ("..", "\\", "?", "#", "*", "%", "\n", "\r"))
        for value in paths
    )


def evaluate(data: dict) -> dict:
    if type(data) is not dict or set(data) != FIELDS or data.get("schema_version") != 1:
        raise InvalidManifest("unexpected_or_missing_fields")
    if type(data["schema_version"]) is not int:
        raise InvalidManifest("invalid_schema_version")
    if type(data["target_type"]) is not str or data["target_type"] not in ("WEB", "API"):
        raise InvalidManifest("invalid_target_type")
    if any(type(data[key]) is not bool for key in REQUIRED_APPROVALS):
        raise InvalidManifest("invalid_approval_type")

    target = data["target_url"]
    host = None
    if type(target) is str and target:
        if len(target) > 300:
            raise InvalidManifest("target_url_too_long")
        try:
            parsed = urlsplit(target)
            host = parsed.hostname
            safe = (
                parsed.scheme == "https"
                and bool(host)
                and parsed.username is None
                and parsed.password is None
                and not parsed.query and not parsed.fragment
                and (parsed.port is None or parsed.port == 443)
                and host not in PRODUCTION_HOSTS
                and host not in ("localhost", "127.0.0.1", "::1")
                and "." in host
                and host.isascii()
            )
        except ValueError:
            safe = False
        if not safe:
            raise InvalidManifest("invalid_or_production_target")
    elif type(target) is not str:
        raise InvalidManifest("invalid_target_type_for_url")

    hosts = data["approved_hosts"]
    if type(hosts) is not list or any(type(h) is not str for h in hosts):
        raise InvalidManifest("invalid_host_allowlist")
    if len(hosts) > 1 or (hosts and (hosts[0] != host or "*" in hosts[0])):
        raise InvalidManifest("host_allowlist_mismatch")
    paths = data["allowed_paths"]
    excluded = data["excluded_paths"]
    if type(paths) is not list or type(excluded) is not list:
        raise InvalidManifest("invalid_path_lists")
    if any(type(x) is not str for x in paths + excluded):
        raise InvalidManifest("invalid_path_type")
    if any(not _paths_are_scoped([value]) for value in paths + excluded):
        raise InvalidManifest("unscoped_or_unsafe_path")
    if len(paths) != len(set(paths)) or len(excluded) != len(set(excluded)):
        raise InvalidManifest("duplicate_path")

    gates = {
        "isolated_target": bool(host and hosts == [host]),
        "explicit_scope": bool(paths) and REQUIRED_EXCLUSIONS.issubset(set(excluded))
                          and not set(paths).intersection(excluded),
        "operator_authorization": data["owner_authorized"],
        "nonproduction_environment": data["isolated_staging_verified"],
        "synthetic_data": data["synthetic_data_only"],
        "plan_and_quota": data["nightvision_plan_quota_verified"],
        "cost_boundary": data["no_unapproved_spend"],
        "recovery": data["rollback_and_restore_verified"],
    }
    ready = all(gates.values())
    return {
        "status": "CONFIG_REVIEW_READY" if ready else "BLOCKED",
        "scan_executed": False,
        "approval_granted_by_tool": False,
        "verification": "SELF_ATTESTED_METADATA_ONLY",
        "gates": {key: "SELF_REPORTED" if value else "BLOCKED" for key, value in gates.items()},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=TEMPLATE)
    parser.add_argument("--strict", action="store_true", help="Return nonzero when a declared gate is blocked")
    args = parser.parse_args()
    try:
        result = evaluate(parse_manifest(args.manifest))
    except InvalidManifest as exc:
        print(json.dumps({"status": "INVALID", "scan_executed": False, "error_code": str(exc)}, sort_keys=True))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 1 if args.strict and result["status"] == "BLOCKED" else 0


if __name__ == "__main__":
    raise SystemExit(main())

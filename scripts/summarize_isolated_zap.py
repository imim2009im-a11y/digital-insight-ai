#!/usr/bin/env python3
"""Summarize isolated ZAP JSON findings without request/response payloads."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

MAX_BYTES = 15 * 1024 * 1024
SEVERITY = ("Info", "Low", "Medium", "High")


def parse_report(path: Path, expected_host: str) -> dict:
    if not expected_host.startswith("dia-local-site-") or not expected_host.replace("-", "").isalnum():
        raise ValueError("invalid_local_target")
    try:
        if path.is_symlink() or path.stat().st_size > MAX_BYTES:
            raise ValueError("unsafe_report_file")
        report = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise ValueError("missing_or_invalid_report") from None
    if not isinstance(report, dict) or not isinstance(report.get("site"), list) or not report["site"]:
        raise ValueError("missing_zap_sites")
    totals = {s: 0 for s in SEVERITY}
    findings = {}
    for site in report["site"]:
        if not isinstance(site, dict):
            raise ValueError("invalid_site")
        try:
            url = urlparse(site.get("@name", ""))
            if url.scheme != "http" or url.hostname != expected_host or url.port != 8000:
                raise ValueError("scan_scope_violation")
        except (ValueError, AttributeError):
            raise ValueError("scan_scope_violation") from None
        if not isinstance(site.get("alerts"), list):
            raise ValueError("missing_alert_list")
        for alert in site["alerts"]:
            if not isinstance(alert, dict):
                raise ValueError("invalid_alert")
            code = str(alert.get("riskcode", ""))
            if code not in ("0", "1", "2", "3"):
                raise ValueError("unknown_riskcode")
            severity = SEVERITY[int(code)]
            totals[severity] += 1
            plugin = str(alert.get("pluginid", "")).strip()
            title = str(alert.get("alert", "Unnamed rule")).strip()
            if not plugin.isdigit():
                plugin = "unidentified"
            title = "".join(c if c.isalnum() or c in " -_().,:/" else " " for c in title)[:90].strip()
            findings[(severity, plugin, title)] = findings.get((severity, plugin, title), 0) + 1
    issues = [
        {"severity": severity, "rule_id": plugin, "name": title, "occurrences": count}
        for (severity, plugin, title), count in sorted(
            findings.items(), key=lambda pair: (-SEVERITY.index(pair[0][0]), pair[0][1], pair[0][2])
        )
    ]
    return {
        "scope": "ISOLATED_STATIC_SITE_REPLICA",
        "network": "DOCKER_INTERNAL_ONLY",
        "production_tested": False,
        "publisher_tested": False,
        "scan_report_parsed": True,
        "risk_totals": totals,
        "findings": issues,
        "limitations": [
            "Header alerts reflect a disposable Python static test server, not production hosting",
            "External services and browser integrations are not reachable in the isolated network",
            "Static production site clone only; no authentication, backend API or real delivery tests",
            "A successful automated test does not prove absence of vulnerabilities",
        ],
    }


def as_markdown(result: dict) -> str:
    rows = ["## Isolated application DAST - sanitized report", "",
            "Scope: local Docker replica of site/ only. Production traffic: none.", "",
            "| Severity | Distinct alerts |", "| --- | ---: |"]
    for severity in reversed(SEVERITY):
        rows.append(f"| {severity} | {result['risk_totals'][severity]} |")
    rows += ["", "### Alerts (manual review required)", "",
             "| Severity | Rule | Description |", "| --- | --- | --- |"]
    for alert in result["findings"][:35]:
        rows.append(f"| {alert['severity']} | {alert['rule_id']} | {alert['name']} |")
    if not result["findings"]:
        rows.append("| - | - | No alerts in the bounded test |")
    rows += ["", "### Limitations", ""]
    for limitation in result["limitations"]:
        rows.append(f"- {limitation}")
    return "\n".join(rows) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--expected-host", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = parse_report(args.report, args.expected_host)
        args.output_dir.mkdir(parents=True, exist_ok=True)
        (args.output_dir / "sanitized-summary.json").write_text(json.dumps(result, sort_keys=True, indent=2) + "\n")
        (args.output_dir / "sanitized-summary.md").write_text(as_markdown(result))
    except (ValueError, OSError):
        print("ISOLATED_DAST_REPORT: INVALID_OR_MISSING_EVIDENCE")
        return 2
    print("ISOLATED_DAST_REPORT: PARSED; results require manual triage")
    print("RISK_COUNTS: " + json.dumps(result["risk_totals"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

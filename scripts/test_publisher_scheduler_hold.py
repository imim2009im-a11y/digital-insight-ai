"""Regression guard for a monitoring-only GitHub Publisher workflow.

Static source guard only: does not execute workflows, use credentials, send HTTP,
or claim live scheduler authentication/queue safety. Requires Python stdlib.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "digital-insight-publisher-ops.yml"
OBSERVATIONS = (
    "Explain publication hold",
    "Verify production health and auth configuration",
    "Verify protected API rejects anonymous access",
    "Verify frontend assets and security headers",
    "Summarize publisher check outcomes",
    "Open one incident issue on failure",
)


def audit_publisher_hold(source: str) -> None:
    """Fail closed if old publishing paths or unsafe incident handling return."""
    lines = source.splitlines()
    assert "  schedule:" in lines, "Scheduled health observation must exist"
    assert "  workflow_dispatch:" in lines, "Manual observations must be available"
    for step in OBSERVATIONS:
        assert source.count("      - name: " + step + "\n") == 1, "Missing or duplicated observation step: " + step
    assert "Publisher execution remains HELD" in source, "Explicit publication hold must remain"
    forbidden = (
        "/api/run-due",
        "DIA_SCHEDULER_TOKEN",
        "steps.run_due",
        "gh issue close",
        "cat /tmp/state-body",
        "method: 'POST'",
        'method: "POST"',
        "curl -X POST",
        "curl --request POST",
    )
    for term in forbidden:
        assert term not in source, "Publication or sensitive-response action returned: " + term
    assert "if: steps.health.outcome == 'failure' || steps.auth_guard.outcome == 'failure' || steps.frontend.outcome == 'failure'" in source, (
        "Incident failure path must track observation outcomes"
    )


class PublisherHoldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_safe_monitoring_workflow(self):
        audit_publisher_hold(self.source)

    def test_rejects_publisher_endpoint(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# /api/run-due\n")

    def test_rejects_credentials_in_monitoring(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# DIA_SCHEDULER_TOKEN\n")

    def test_rejects_post_requests(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n      - name: Bypass\n        run: curl -X POST https://example.test/api/publish\n")

    def test_rejects_auto_closing_incident(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# gh issue close 101\n")

    def test_rejects_sensitive_body_logging(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# cat /tmp/state-body\n")

    def test_rejects_hidden_scheduler_outcome(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# steps.run_due\n")

    def test_rejects_missing_observation_step(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source.replace("      - name: Verify production health and auth configuration", "      - name: Removed health check", 1))


if __name__ == "__main__":
    unittest.main()

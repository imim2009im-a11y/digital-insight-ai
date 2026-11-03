"""Fail-closed source regression for the Publisher scheduler recovery hold.

No network, credentials, external packages, or production publication.
This test does not prove the installed GitHub workflow's runtime behavior.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "digital-insight-publisher-ops.yml"
GUARD = ("if: github.event_name == 'workflow_dispatch' && "
         "vars.DIA_SCHEDULER_RELEASE_APPROVED == 'true'")


def audit_publisher_hold(source: str) -> None:
    """Raise AssertionError if the known workflow could bypass its hold."""
    lines = source.splitlines()
    markers = [(i, line[len("      - name: "):].strip())
               for i, line in enumerate(lines)
               if line.startswith("      - name: ")]
    steps = []
    for number, (start, name) in enumerate(markers):
        end = markers[number + 1][0] if number + 1 < len(markers) else len(lines)
        steps.append((name, lines[start:end]))

    gated = [block for name, block in steps if name == "Run due publishing jobs"]
    assert len(gated) == 1, "Exactly one guarded publishing step is required"
    gated_lines = [line.strip() for line in gated[0]]
    assert GUARD in gated_lines, "The publishing step must require manual dispatch and an approval flag"
    assert any("/api/run-due" in line for line in gated_lines), "Publishing call must remain inside the gated step"
    assert any("secrets.DIA_SCHEDULER_TOKEN" in line for line in gated_lines), "Keep credentials in the guarded step only"

    outside_lines = [line for name, block in steps
                     if name != "Run due publishing jobs" for line in block]
    assert not any("/api/run-due" in line for line in outside_lines), "Ungated publishing endpoint reference"
    assert not any("DIA_SCHEDULER_TOKEN" in line for line in outside_lines), "Scheduler credential outside guarded step"
    assert not any("gh issue close" in line for line in lines), "Recovery cannot auto-close the incident"
    assert not any("cat /tmp/state-body" in line for line in lines), "Never print auth-response bodies"

    assert "  schedule:" in lines, "Health observations must remain scheduled"
    assert "  workflow_dispatch:" in lines, "Manual control must be explicitly declared"


class PublisherHoldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_current_recovery_workflow_is_held(self):
        audit_publisher_hold(self.source)

    def test_rejects_unconditional_dispatch(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source.replace(GUARD, "if: github.event_name == 'workflow_dispatch'", 1))

    def test_rejects_missing_manual_gate(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source.replace(GUARD, "if: vars.DIA_SCHEDULER_RELEASE_APPROVED == 'true'", 1))

    def test_rejects_another_publishing_step(self):
        tampered = self.source + ("\n      - name: Ungated publish\n"
                                   "        run: curl https://example.test/api/run-due\n")
        with self.assertRaises(AssertionError):
            audit_publisher_hold(tampered)

    def test_rejects_automatic_incident_closure(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# gh issue close 101\n")

    def test_rejects_anonymous_response_body_logging(self):
        with self.assertRaises(AssertionError):
            audit_publisher_hold(self.source + "\n# cat /tmp/state-body\n")


if __name__ == "__main__":
    unittest.main()

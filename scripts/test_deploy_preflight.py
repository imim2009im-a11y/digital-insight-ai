#!/usr/bin/env python3
"""Guard the production Pages workflow against deploying unverified site changes.

This tests the workflow source (not the GitHub Pages HTTP response policy).
No network calls or non-standard Python packages are required.
"""
import re
import unittest
from pathlib import Path

WORKFLOW = Path(".github/workflows/pages-staging.yml")
TEXT = WORKFLOW.read_text(encoding="utf-8")


class DeploymentPreflightTest(unittest.TestCase):
    def test_deployment_is_blocked_by_preflight(self):
        self.assertRegex(TEXT, r"(?m)^  preflight:\s*$")
        self.assertRegex(TEXT, r"(?m)^  deploy:\s*\n    needs: preflight\s*$")
        self.assertNotIn("continue-on-error: true", TEXT)

    def test_preflight_has_static_and_interaction_coverage(self):
        match = re.search(r"(?ms)^  preflight:\s*\n(.*?)^  deploy:", TEXT)
        self.assertIsNotNone(match)
        preflight = match.group(1)
        for command in (
            "python3 scripts/site-professional-check.py",
            "node --check site/assets/app.js",
            "node --check site/assets/directory.js",
            "node --check site/assets/site.js",
            "node --check site/assets/guides.js",
            "node --test scripts/site-interactions.test.cjs scripts/guides-library.test.cjs",
        ):
            with self.subTest(command=command):
                self.assertIn(command, preflight)

    def test_deployment_token_is_not_granted_to_preflight(self):
        workflow_scope, jobs = TEXT.split("\njobs:\n", 1)
        self.assertNotIn("pages: write", workflow_scope)
        self.assertNotIn("id-token: write", workflow_scope)
        preflight = jobs.split("\n  deploy:", 1)[0]
        deploy = jobs.split("\n  deploy:", 1)[1]
        self.assertNotIn("pages: write", preflight)
        self.assertNotIn("id-token: write", preflight)
        self.assertIn("pages: write", deploy)
        self.assertIn("id-token: write", deploy)


if __name__ == "__main__":
    unittest.main()

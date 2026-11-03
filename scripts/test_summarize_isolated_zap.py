"""Synthetic tests for isolated ZAP report scope controls and redaction."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from summarize_isolated_zap import parse_report, as_markdown


class IsolatedZAPTests(unittest.TestCase):
    HOST = "dia-local-site-1234"

    def sample(self):
        return {
            "@version": "test",
            "site": [{
                "@name": f"http://{self.HOST}:8000",
                "alerts": [{
                    "riskcode": "2",
                    "pluginid": "10020",
                    "alert": "Missing Anti-clickjacking Header",
                    "instances": [{
                        "uri": f"http://{self.HOST}:8000/private?secret=redacted",
                        "requestHeader": "Authorization: should-not-leak",
                    }],
                }],
            }],
        }

    def parse(self, report):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "report.json"
            path.write_text(json.dumps(report))
            return parse_report(path, self.HOST)

    def test_valid_local_report(self):
        result = self.parse(self.sample())
        self.assertEqual(result["risk_totals"]["Medium"], 1)
        self.assertFalse(result["production_tested"])
        self.assertFalse(result["publisher_tested"])

    def test_sensitive_request_data_not_in_summary(self):
        result = self.parse(self.sample())
        public = json.dumps(result) + as_markdown(result)
        self.assertNotIn("Authorization", public)
        self.assertNotIn("should-not-leak", public)
        self.assertNotIn("secret=redacted", public)

    def test_refuses_production_host(self):
        report = self.sample()
        report["site"][0]["@name"] = "https://digitalinsightai.com/"
        with self.assertRaises(ValueError):
            self.parse(report)

    def test_refuses_external_report_host(self):
        report = self.sample()
        report["site"][0]["@name"] = "http://external.example:8000"
        with self.assertRaises(ValueError):
            self.parse(report)

    def test_refuses_arbitrary_expected_host(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "data.json"
            path.write_text(json.dumps(self.sample()))
            with self.assertRaises(ValueError):
                parse_report(path, "digitalinsightai.com")

    def test_missing_scan_results_fail_closed(self):
        with self.assertRaises(ValueError):
            self.parse({"site": []})

    def test_unknown_risk_rejected(self):
        report = self.sample()
        report["site"][0]["alerts"][0]["riskcode"] = "UNKNOWN"
        with self.assertRaises(ValueError):
            self.parse(report)

    def test_nested_unexpected_host_rejected(self):
        report = self.sample()
        report["site"].append({"@name": "http://unapproved:8000", "alerts": []})
        with self.assertRaises(ValueError):
            self.parse(report)

    def test_absent_report_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                parse_report(Path(folder) / "missing.json", self.HOST)

    def test_no_alerts_does_not_claim_prod_clear(self):
        report = self.sample()
        report["site"][0]["alerts"] = []
        result = self.parse(report)
        self.assertFalse(result["production_tested"])
        self.assertIn("does not prove absence", as_markdown(result))

    def test_control_characters_removed(self):
        report = self.sample()
        report["site"][0]["alerts"][0]["alert"] = "Alpha\n<script>alert('bad')</script>"
        result = self.parse(report)
        self.assertNotIn("<script>", as_markdown(result))

    def test_wrong_port_rejected(self):
        report = self.sample()
        report["site"][0]["@name"] = f"http://{self.HOST}:9000"
        with self.assertRaises(ValueError):
            self.parse(report)


    def test_high_alerts_block_review(self):
        report = self.sample()
        report["site"][0]["alerts"][0]["riskcode"] = "3"
        result = self.parse(report)
        self.assertEqual(result["review_decision"], "FAIL_HIGH_ALERTS")
        self.assertEqual(result["risk_totals"]["High"], 1)

    def test_medium_alerts_require_manual_review(self):
        self.assertEqual(self.parse(self.sample())["review_decision"], "MANUAL_TRIAGE_REQUIRED")

    def test_zero_alerts_do_not_certify_production(self):
        report = self.sample()
        report["site"][0]["alerts"] = []
        result = self.parse(report)
        self.assertEqual(result["review_decision"], "NO_ALERTS_IN_ISOLATED_SCOPE")
        self.assertFalse(result["production_tested"])

    def test_host_requires_numeric_run_identifier(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "data.json"
            path.write_text(json.dumps(self.sample()))
            for bad in ("dia-local-site-", "dia-local-site-production", "dia-local-site-1234.fake"):
                with self.subTest(host=bad), self.assertRaises(ValueError):
                    parse_report(path, bad)


if __name__ == "__main__":
    unittest.main()

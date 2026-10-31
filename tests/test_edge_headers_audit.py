"""Offline, deterministic tests. No requests to production or external APIs."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from edge_headers_audit import evaluate, EXPECTED  # noqa: E402

GOOD = {
    "Strict-Transport-Security": "max-age=31536000",
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; script-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


class HeaderAuditTests(unittest.TestCase):
    def test_all_present(self):
        result = evaluate(GOOD, "https://digitalinsightai.com/")
        self.assertEqual(set(result), set(EXPECTED))
        self.assertEqual(set(result.values()), {"PRESENT"})

    def test_missing_does_not_pass(self):
        result = evaluate({}, "https://digitalinsightai.com/")
        self.assertEqual(set(result.values()), {"NOT_PRESENT"})

    def test_meta_tags_are_not_http_headers(self):
        result = evaluate({"Content-Type": "text/html"}, "https://digitalinsightai.com/")
        self.assertEqual(result["Content-Security-Policy"], "NOT_PRESENT")
        self.assertEqual(result["Strict-Transport-Security"], "NOT_PRESENT")

    def test_weak_hsts_and_csp_are_not_pass(self):
        weak = dict(GOOD, **{
            "Strict-Transport-Security": "max-age=0",
            "Content-Security-Policy": "default-src 'self'",
        })
        result = evaluate(weak, "https://digitalinsightai.com/")
        self.assertEqual(result["Strict-Transport-Security"], "WEAK")
        self.assertEqual(result["Content-Security-Policy"], "WEAK")

    def test_permissive_csp_cannot_pass_by_directive_names(self):
        weak = dict(GOOD)
        weak["Content-Security-Policy"] = "default-src *; frame-ancestors *; object-src 'none'; base-uri 'self'"
        self.assertEqual(evaluate(weak, "https://digitalinsightai.com/")["Content-Security-Policy"], "WEAK")
        weak["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; script-src 'unsafe-inline'"
        self.assertEqual(evaluate(weak, "https://digitalinsightai.com/")["Content-Security-Policy"], "WEAK")

    def test_short_hsts_does_not_satisfy_production_baseline(self):
        weak = dict(GOOD)
        weak["Strict-Transport-Security"] = "max-age=300"
        self.assertEqual(evaluate(weak, "https://digitalinsightai.com/")["Strict-Transport-Security"], "WEAK")

    def test_no_object_src_or_base_uri_is_weak(self):
        weak = dict(GOOD)
        weak["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        self.assertEqual(evaluate(weak, "https://digitalinsightai.com/")["Content-Security-Policy"], "WEAK")

    def test_header_keys_case_insensitive(self):
        self.assertEqual(set(evaluate({k.lower(): v for k, v in GOOD.items()},
                                      "https://digitalinsightai.com/").values()), {"PRESENT"})

    def test_fixture_reports_evidence_not_live(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "headers.json"
            p.write_text(json.dumps({"url": "https://digitalinsightai.com/", "headers": GOOD}))
            result = subprocess.run([sys.executable, str(ROOT / "scripts/edge_headers_audit.py"),
                                     "--fixture", str(p), "--strict"],
                                    text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads(result.stdout)
            self.assertEqual(report["evidence"], "LOCAL_FIXTURE_NOT_LIVE")
            self.assertEqual(report["status"], "BASELINE_PRESENT")

    def test_missing_headers_fail_strict(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "headers.json"
            p.write_text(json.dumps({"headers": {}}))
            result = subprocess.run([sys.executable, str(ROOT / "scripts/edge_headers_audit.py"),
                                     "--fixture", str(p), "--strict"],
                                    text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)["status"], "GAPS_IDENTIFIED")

    def test_noncanonical_fixture_host_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "headers.json"
            p.write_text(json.dumps({"url": "https://untrusted.example/", "headers": GOOD}))
            result = subprocess.run([sys.executable, str(ROOT / "scripts/edge_headers_audit.py"),
                                     "--fixture", str(p)],
                                    text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)["status"], "NOT_VERIFIED")


if __name__ == "__main__":
    unittest.main()

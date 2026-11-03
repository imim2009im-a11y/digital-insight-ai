"""Synthetic regressions for the offline NightVision readiness metadata gate."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nightvision_readiness import (
    InvalidManifest, REQUIRED_APPROVALS, REQUIRED_EXCLUSIONS, TEMPLATE,
    evaluate, parse_manifest,
)


def review_ready():
    data = parse_manifest(TEMPLATE)
    data.update({
        "target_url": "https://isolated-staging.example.org/",
        "approved_hosts": ["isolated-staging.example.org"],
        "allowed_paths": ["/sample/"],
    })
    data.update({key: True for key in REQUIRED_APPROVALS})
    return data


class NightVisionReadinessTests(unittest.TestCase):
    def test_unconfigured_repository_defaults_blocked(self):
        result = evaluate(parse_manifest(TEMPLATE))
        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["scan_executed"])

    def test_synthetic_review_ready_is_not_approval_or_scan(self):
        result = evaluate(review_ready())
        self.assertEqual(result["status"], "CONFIG_REVIEW_READY")
        self.assertFalse(result["scan_executed"])
        self.assertFalse(result["approval_granted_by_tool"])
        self.assertEqual(result["verification"], "SELF_ATTESTED_METADATA_ONLY")

    def test_all_six_manual_gates_required(self):
        for name in REQUIRED_APPROVALS:
            with self.subTest(name=name):
                data = review_ready()
                data[name] = False
                self.assertEqual(evaluate(data)["status"], "BLOCKED")

    def test_known_production_hosts_rejected(self):
        for target in (
            "https://digitalinsightai.com/",
            "https://www.digitalinsightai.com/",
            "https://digital-insight-publisher.onrender.com/",
        ):
            with self.subTest(target=target):
                data = review_ready()
                data["target_url"] = target
                data["approved_hosts"] = [target.split("/")[2]]
                with self.assertRaises(InvalidManifest):
                    evaluate(data)

    def test_insecure_or_credentialed_url_rejected(self):
        for target in (
            "http://isolated-staging.example.org/",
            "https://user:password@isolated-staging.example.org/",
            "https://isolated-staging.example.org/?secret=yes",
            "https://isolated-staging.example.org/#fragment",
            "https://localhost/",
            "https://isolated-staging.example.org:8080/",
        ):
            with self.subTest(target=target):
                data = review_ready()
                data["target_url"] = target
                with self.assertRaises(InvalidManifest):
                    evaluate(data)

    def test_missing_mandatory_exclusion_blocks(self):
        for exclusion in REQUIRED_EXCLUSIONS:
            with self.subTest(exclusion=exclusion):
                data = review_ready()
                data["excluded_paths"].remove(exclusion)
                self.assertEqual(evaluate(data)["status"], "BLOCKED")

    def test_unscoped_paths_rejected(self):
        for bad in ("/", "//double", "/../admin", "/something*", "/api/%2F", "/query?x=y"):
            data = review_ready()
            data["allowed_paths"] = [bad]
            with self.subTest(path=bad), self.assertRaises(InvalidManifest):
                evaluate(data)

    def test_unknown_fields_cannot_enable_runtime_execution(self):
        for extra in ("scan_enabled", "nightvision_token", "auto_run"):
            data = review_ready()
            data[extra] = True
            with self.subTest(field=extra), self.assertRaises(InvalidManifest):
                evaluate(data)

    def test_wrong_type_is_rejected(self):
        for name in REQUIRED_APPROVALS:
            data = review_ready()
            data[name] = "true"
            with self.subTest(field=name), self.assertRaises(InvalidManifest):
                evaluate(data)

    def test_exact_approved_host_required(self):
        data = review_ready()
        data["approved_hosts"] = ["different-staging.example.org"]
        with self.assertRaises(InvalidManifest):
            evaluate(data)

    def test_duplicate_json_key_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "manifest.json"
            path.write_text('{"schema_version":1,"schema_version":1}')
            with self.assertRaises(InvalidManifest):
                parse_manifest(path)

    def test_symlink_manifest_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            alias = Path(folder) / "manifest.json"
            alias.symlink_to(TEMPLATE)
            with self.assertRaises(InvalidManifest):
                parse_manifest(alias)


if __name__ == "__main__":
    unittest.main()

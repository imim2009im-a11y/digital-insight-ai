"""Offline verification of all approved legacy HTML fallback routes."""
import unittest
from pathlib import Path
from sync_legacy_routes import ROOT, LEGACY_TARGETS, generate, validate_rules


class LegacyRouteTests(unittest.TestCase):
    def test_all_approved_aliases_are_in_redirects_mapping(self):
        mapping = validate_rules()
        self.assertEqual(mapping, LEGACY_TARGETS)
        self.assertEqual(len(mapping), 8)

    def test_all_aliases_have_exact_generated_fallbacks(self):
        for path, destination in LEGACY_TARGETS.items():
            with self.subTest(path=path):
                source = ROOT / path
                self.assertTrue(source.is_file())
                self.assertEqual(source.read_text(encoding="utf-8"), generate(destination))

    def test_targets_are_real_canonical_pages(self):
        for destination in LEGACY_TARGETS.values():
            self.assertTrue((ROOT / destination.lstrip("/") / "index.html").is_file())

    def test_html_fallback_does_not_falsely_claim_http_301(self):
        for destination in LEGACY_TARGETS.values():
            text = generate(destination)
            self.assertIn('<meta http-equiv="refresh" content="0;url=', text)
            self.assertIn('name="robots" content="noindex,follow"', text)
            self.assertIn('href="https://digitalinsightai.com' + destination + '"', text)
            self.assertNotIn('HTTP/1.1 301', text)


if __name__ == "__main__":
    unittest.main()

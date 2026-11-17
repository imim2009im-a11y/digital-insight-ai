"""Synthetic security regression tests for the offline static-site checker."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from site_security_lint import audit_text, audit_directory


class StaticSecurityTests(unittest.TestCase):
    def test_safe_relative_assets_and_internal_get_form(self):
        html = '<script src="/assets/app.js"></script><form method="get" action="/tools/"></form>'
        self.assertEqual(audit_text(html), [])

    def test_external_https_post_known_service_is_allowed(self):
        html = '<form method="post" action="https://formspree.io/f/example"></form>'
        self.assertEqual(audit_text(html), [])

    def test_plain_http_post_rejected(self):
        self.assertIn("UNAPPROVED_POST_DESTINATION", audit_text('<form method="post" action="http://formspree.io/f/x"></form>'))

    def test_external_unapproved_post_rejected(self):
        self.assertIn("UNAPPROVED_POST_DESTINATION", audit_text('<form method="post" action="https://other.example/form"></form>'))

    def test_credentials_in_post_action_rejected(self):
        self.assertIn("UNSAFE_POST_URL", audit_text('<form method="post" action="https://u:p@formspree.io/f/x"></form>'))

    def test_javascript_urls_rejected(self):
        self.assertIn("JAVASCRIPT_URL", audit_text('<a href=" javascript:alert(1)">link</a>'))

    def test_inline_handlers_rejected(self):
        self.assertIn("INLINE_EVENT_HANDLER", audit_text('<img src="img.png" onerror="alert(1)">'))

    def test_http_active_assets_rejected(self):
        for html in (
            '<script src="http://invalid.example/app.js"></script>',
            '<iframe src="http://invalid.example/frame"></iframe>',
            '<link rel="stylesheet" href="http://invalid.example/style.css">',
            '<img src="http://invalid.example/pixel.png">',
        ):
            with self.subTest(html=html):
                self.assertIn("INSECURE_ACTIVE_RESOURCE", audit_text(html))

    def test_static_data_does_not_trigger_false_positive(self):
        self.assertEqual(audit_text('<script type="application/ld+json">{"@context":"https://schema.org"}</script>'), [])

    def test_directory_scanned_without_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "index.html").write_text('<a href="javascript:void(0)">x</a>', encoding="utf-8")
            self.assertEqual(audit_directory(root), [("index.html", "JAVASCRIPT_URL")])

    def test_missing_directory_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                audit_directory(Path(tmp) / "does-not-exist")

    def test_nested_page_reports_relative_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "news").mkdir()
            (root / "news" / "index.html").write_text('<iframe src="http://elsewhere.test/"></iframe>', encoding="utf-8")
            self.assertEqual(audit_directory(root), [("news/index.html", "INSECURE_ACTIVE_RESOURCE")])


if __name__ == "__main__":
    unittest.main()

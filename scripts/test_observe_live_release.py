"""Pure, offline tests for the live-release HTTP observer."""
import unittest

from observe_live_release import classify_alias, classify_page


class ReleaseHTTPTests(unittest.TestCase):
    def test_200_response_without_security_headers_is_not_approved(self):
        issues = classify_page(200, {"Content-Type": "text/html"})
        self.assertIn("missing observed content-security-policy", issues)
        self.assertIn("missing observed frame embedding protection", issues)

    def test_expected_security_headers_satisfy_observation(self):
        headers = {
            "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
            "referrer-policy": "strict-origin-when-cross-origin",
            "x-content-type-options": "nosniff",
            "strict-transport-security": "max-age=31536000",
        }
        self.assertEqual(classify_page(200, headers), [])

    def test_html_200_is_not_mislabeled_as_permanent_redirect(self):
        issues = classify_alias("https://digitalinsightai.com", "/tools.html",
                                200, {}, "/tools/")
        self.assertIn("missing permanent HTTP 301/308 redirect", issues)

    def test_redirect_to_external_origin_is_rejected(self):
        issues = classify_alias("https://digitalinsightai.com", "/tools.html",
                                301, {"Location": "https://not-the-official-host.test/tools/"},
                                "/tools/")
        self.assertTrue(issues)

    def test_direct_relative_301_to_expected_path_is_accepted(self):
        self.assertEqual(classify_alias("https://digitalinsightai.com", "/tools.html",
                                        301, {"Location": "/tools/"}, "/tools/"), [])

    def test_wrong_canonical_path_is_rejected(self):
        self.assertTrue(classify_alias("https://digitalinsightai.com", "/start.html",
                                       308, {"Location": "/tools/"}, "/guides/"))


if __name__ == "__main__":
    unittest.main()

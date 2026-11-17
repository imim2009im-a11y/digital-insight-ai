import unittest
from monitor_response_headers import audit_headers

class HeaderAuditTests(unittest.TestCase):
    def test_secure_headers_accepted(self):
        headers = {
            'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
            'Strict-Transport-Security': 'max-age=31536000',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=()',
        }
        errors, warnings = audit_headers('https://digitalinsightai.com/guides/', headers)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_no_pretend_config_files_enforce_headers(self):
        errors, warnings = audit_headers('https://digitalinsightai.com/guides/', {})
        self.assertEqual(errors, [])
        self.assertIn('Content-Security-Policy is not observed', warnings)
        self.assertIn('frame embedding protection is not observed', warnings)

    def test_rejects_unexpected_origin_or_insecure_transport(self):
        for url in ('http://digitalinsightai.com/guides/', 'https://unexpected.example/guides/'):
            errors, _ = audit_headers(url, {})
            self.assertTrue(errors, url)

    def test_case_insensitive_headers(self):
        headers = {'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin'}
        _, warnings = audit_headers('https://digitalinsightai.com/guides/', headers)
        self.assertFalse(any('X-Content-Type-Options' in warning for warning in warnings))
        self.assertFalse(any('Referrer-Policy' in warning for warning in warnings))

if __name__ == '__main__': unittest.main()

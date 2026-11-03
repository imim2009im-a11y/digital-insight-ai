"""Behavioral tests for the disposable loopback-only synthetic security target."""
import http.client
from pathlib import Path
import sys
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nightvision_synthetic_target import PAGE, make_server


class SyntheticTargetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server()
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def request(self, method: str, path: str):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            conn.request(method, path, body=b"synthetic-input" if method != "GET" else None)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_only_loopback_and_ephemeral_port(self):
        address, port = self.server.server_address
        self.assertEqual(address, "127.0.0.1")
        self.assertGreater(port, 0)

    def test_synthetic_homepage_only(self):
        status, headers, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(body, PAGE)
        self.assertIn(b"Generated test content only", body)
        self.assertNotIn(b"<form", body.lower())
        self.assertNotIn(b"https://", body.lower())
        self.assertEqual(headers.get("Cache-Control"), "no-store")

    def test_healthcheck_only_returns_synthetic_indicator(self):
        status, _, body = self.request("GET", "/healthz")
        self.assertEqual((status, body), (200, b"synthetic-ok\n"))

    def test_unknown_path_never_serves_application(self):
        for path in ("/admin", "/api/run-due", "/api/publish", "/billing", "/logout"):
            with self.subTest(path=path):
                status, _, _ = self.request("GET", path)
                self.assertEqual(status, 404)

    def test_mutating_methods_are_rejected(self):
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            with self.subTest(method=method):
                status, headers, body = self.request(method, "/")
                self.assertEqual(status, 405)
                self.assertEqual(headers.get("Allow"), "GET")
                self.assertEqual(body, b"")

    def test_response_security_headers(self):
        _, headers, _ = self.request("GET", "/")
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")
        self.assertIn("default-src 'none'", headers.get("Content-Security-Policy", ""))


if __name__ == "__main__":
    unittest.main()

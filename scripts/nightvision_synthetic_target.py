#!/usr/bin/env python3
"""Disposable loopback-only synthetic HTTP target for offline security QA.

No production data, credentials, external calls, disk writes, or scan engines.
Never bind beyond 127.0.0.1. Start manually for local inspection only.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PAGE = (
    "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
    "<title>Synthetic Security Test Target</title></head>"
    "<body><main><h1>Isolated Synthetic Test</h1>"
    "<p>Generated test content only. No forms or outbound links.</p>"
    "</main></body></html>"
).encode("utf-8")


class SyntheticHandler(BaseHTTPRequestHandler):
    def _respond(self, status: int, body: bytes = b"", mime: str = "text/plain") -> None:
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'none'; frame-ancestors 'none'; form-action 'none'")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/":
            self._respond(200, PAGE, "text/html; charset=utf-8")
        elif self.path == "/healthz":
            self._respond(200, b"synthetic-ok\n")
        else:
            self._respond(404, b"not found\n")

    def _method_not_allowed(self) -> None:
        self.send_response(405)
        self.send_header("Allow", "GET")
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_POST(self) -> None:
        self._method_not_allowed()

    def do_PUT(self) -> None:
        self._method_not_allowed()

    def do_PATCH(self) -> None:
        self._method_not_allowed()

    def do_DELETE(self) -> None:
        self._method_not_allowed()

    def log_message(self, format_string: str, *args: object) -> None:
        # Intentionally avoids logging URLs/headers if future tests use private fixtures.
        pass


def make_server() -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", 0), SyntheticHandler)
    server.daemon_threads = True
    return server


if __name__ == "__main__":
    with make_server() as server:
        print(f"Disposable loopback-only test target: http://127.0.0.1:{server.server_port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

#!/usr/bin/env python3
"""Read-only canonical-domain HTTP audit for PR release reviews.

Never sends credentials or form submissions. Reports the site's ACTUAL HTTP
status and headers; does not infer behavior from _headers or _redirects files.
A failed network observation is UNKNOWN, not a passing security result.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener

CANONICAL = "https://digitalinsightai.com"
PAGES = ("/", "/tools/", "/guides/", "/contact/")
LEGACY_ALIASES = {
    "/tools.html": "/tools/",
    "/start.html": "/guides/",
    "/methodology.html": "/about/",
    "/privacy-policy.html": "/privacy/",
}
USER_AGENT = "DigitalInsightAI-ReadOnlyReleaseAudit/1.0"


class NoFollow(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def observe(url):
    """One HEAD request. No redirect follows, no cookies, no uploads, no auth."""
    request = Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
    try:
        with build_opener(NoFollow).open(request, timeout=12) as response:
            return response.status, dict(response.headers)
    except HTTPError as error:
        # urllib raises for 3xx when we intentionally refuse to follow.
        return error.code, dict(error.headers)


def classify_page(status, headers):
    issues = []
    if status != 200:
        issues.append("canonical page is not HTTP 200")
    found = {str(k).lower(): str(v) for k, v in headers.items()}
    for name in ("content-security-policy", "referrer-policy",
                 "x-content-type-options", "strict-transport-security"):
        if not found.get(name):
            issues.append("missing observed " + name)
    if "frame-ancestors" not in found.get("content-security-policy", "").lower() and (
            found.get("x-frame-options", "").lower() not in ("deny", "sameorigin")):
        issues.append("missing observed frame embedding protection")
    return issues


def classify_alias(origin, path, status, headers, expected):
    # A refresh in HTML is not a permanent HTTP redirect.
    if status not in (301, 308):
        return ["missing permanent HTTP 301/308 redirect"]
    found = {str(k).lower(): str(v) for k, v in headers.items()}
    destination = urljoin(origin + path, found.get("location", ""))
    target = urlsplit(destination)
    if target.scheme != "https" or target.netloc != "digitalinsightai.com" or (
            target.path != expected):
        return ["redirect does not target the expected secure canonical route"]
    return []


def run_audit():
    report = {"observedAtUTC": datetime.now(timezone.utc).isoformat(),
              "scope": "public HTTP HEAD, read-only, no redirects followed",
              "results": []}
    for path in PAGES + tuple(LEGACY_ALIASES):
        kind = "canonical" if path in PAGES else "legacy-alias"
        result = {"path": path, "type": kind, "status": None, "issues": []}
        try:
            status, headers = observe(CANONICAL + path)
            result["status"] = status
            result["issues"] = (classify_page(status, headers)
                                if kind == "canonical" else classify_alias(
                                    CANONICAL, path, status, headers, LEGACY_ALIASES[path]))
            result["observedHeaders"] = {
                name: value for name, value in headers.items()
                if name.lower() in ("content-security-policy", "strict-transport-security",
                                    "x-frame-options", "referrer-policy", "x-content-type-options",
                                    "location", "permissions-policy", "server")
            }
        except (OSError, URLError, TimeoutError, ValueError) as exc:
            result["issues"] = ["observation unavailable (" + type(exc).__name__ + ")"]
        report["results"].append(result)
    return report


def main():
    report = run_audit()
    print("# Read-only production HTTP evidence")
    print("Observed at (UTC):", report["observedAtUTC"])
    print("No production files, forms, accounts, or DNS were modified.")
    for result in report["results"]:
        print("ROUTE", result["path"], "HTTP", result["status"] if result["status"] is not None else "UNKNOWN")
        for issue in result["issues"]:
            print("  UNVERIFIED:", issue)
        if not result["issues"]:
            print("  PASS: specified HTTP expectations observed")
    print("AUDIT_JSON_START")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print("AUDIT_JSON_END")
    # Observation-only: absence of a configured response header is an approval
    # blocker, not evidence that the feature PR caused the issue.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

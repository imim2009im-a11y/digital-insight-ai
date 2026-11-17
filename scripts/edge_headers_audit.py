#!/usr/bin/env python3
"""Evidence-only audit of security response headers for the canonical public site.

No account access, credentials, mutations, crawling, or arbitrary URL arguments.
Never prints response header values (which may contain sensitive data).
"""
from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

CANONICAL_URL = "https://digitalinsightai.com/"
ALLOWED_HOSTS = frozenset({"digitalinsightai.com", "www.digitalinsightai.com"})
EXPECTED = (
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
)


def csp_meets_static_baseline(value: str) -> bool:
    """Conservative static-site baseline, not a full browser CSP security review."""
    directives: dict[str, list[str]] = {}
    for part in value.lower().split(";"):
        tokens = part.split()
        if not tokens:
            continue
        if tokens[0] in directives:
            return False  # Duplicate directives are ambiguous to simple scanners.
        directives[tokens[0]] = tokens[1:]
    defaults = directives.get("default-src", [])
    frames = directives.get("frame-ancestors", [])
    objects = directives.get("object-src", [])
    bases = directives.get("base-uri", [])
    if not defaults or not set(defaults).issubset({"'self'", "'none'"}):
        return False
    if not frames or not set(frames).issubset({"'none'", "'self'"}):
        return False
    if objects != ["'none'"]:
        return False
    if not bases or not set(bases).issubset({"'none'", "'self'"}):
        return False
    scripts = directives.get("script-src", defaults)
    if any(v in scripts for v in ("*", "'unsafe-inline'", "'unsafe-eval'", "http:", "https:", "data:")):
        return False
    return True


def evaluate(headers: dict[str, str], final_url: str) -> dict[str, str]:
    """Return categorical evidence, never any raw response-header values."""
    h = {str(key).lower(): str(value).strip() for key, value in headers.items()}
    result: dict[str, str] = {}
    scheme = urlsplit(final_url).scheme
    hsts = h.get("strict-transport-security", "")
    match = re.search(r"(?:^|;)\s*max-age\s*=\s*(\d+)\s*(?:;|$)", hsts, re.I)
    result["Strict-Transport-Security"] = (
        "NOT_PRESENT" if not hsts else
        "WEAK" if scheme != "https" or not match or int(match.group(1)) < 31536000 else "PRESENT"
    )
    csp = h.get("content-security-policy", "").lower()
    result["Content-Security-Policy"] = (
        "NOT_PRESENT" if not csp else
        "PRESENT" if csp_meets_static_baseline(csp) else "WEAK"
    )
    xcto = h.get("x-content-type-options", "").lower()
    result["X-Content-Type-Options"] = "PRESENT" if xcto == "nosniff" else ("WEAK" if xcto else "NOT_PRESENT")
    xfo = h.get("x-frame-options", "").upper()
    result["X-Frame-Options"] = "PRESENT" if xfo in {"DENY", "SAMEORIGIN"} else ("WEAK" if xfo else "NOT_PRESENT")
    ref = h.get("referrer-policy", "").lower()
    allowed = {"no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"}
    result["Referrer-Policy"] = "PRESENT" if ref in allowed else ("WEAK" if ref else "NOT_PRESENT")
    perm = h.get("permissions-policy", "").lower().replace(" ", "")
    denied = ("camera=()", "microphone=()", "geolocation=()")
    result["Permissions-Policy"] = (
        "NOT_PRESENT" if not perm else "PRESENT" if all(p in perm for p in denied) else "WEAK"
    )
    return result


def fetch_public_headers(url: str = CANONICAL_URL) -> tuple[str, dict[str, str]]:
    """Fetch a fixed public URL only; HTTPS verified, bounded timeout and redirect."""
    if url != CANONICAL_URL:
        raise ValueError("Only the fixed canonical public URL is supported")
    req = Request(url, headers={"User-Agent": "DigitalInsight-HeaderAudit/1.0", "Accept": "text/html"})
    try:
        with urlopen(req, timeout=12, context=ssl.create_default_context()) as response:
            final_url = response.geturl()
            if urlsplit(final_url).scheme != "https" or urlsplit(final_url).hostname not in ALLOWED_HOSTS:
                raise ValueError("Unexpected redirect or non-HTTPS destination")
            if response.status != 200:
                raise ValueError("Unexpected response status")
            return final_url, dict(response.headers.items())
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(type(exc).__name__) from None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--live", action="store_true", help="Check the canonical public HTTPS response")
    group.add_argument("--fixture", help="Use local test evidence JSON; no network")
    parser.add_argument("--strict", action="store_true", help="Exit nonzero when a header is absent or weak")
    args = parser.parse_args()
    try:
        if args.live:
            url, headers = fetch_public_headers()
            evidence = "LIVE_PUBLIC_HTTPS"
        else:
            with open(args.fixture, encoding="utf-8") as f:
                record = json.load(f)
            if not isinstance(record, dict) or not isinstance(record.get("headers"), dict):
                raise ValueError("Invalid fixture shape")
            url = str(record.get("url", CANONICAL_URL))
            if urlsplit(url).scheme != "https" or urlsplit(url).hostname not in ALLOWED_HOSTS:
                raise ValueError("Fixture URL is not an approved HTTPS host")
            headers = record["headers"]
            evidence = "LOCAL_FIXTURE_NOT_LIVE"
        checks = evaluate(headers, url)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "NOT_VERIFIED", "reason": type(exc).__name__}, sort_keys=True))
        return 2

    status = "BASELINE_PRESENT" if all(v == "PRESENT" for v in checks.values()) else "GAPS_IDENTIFIED"
    print(json.dumps({"evidence": evidence, "status": status, "checks": checks},
                     ensure_ascii=False, sort_keys=True))
    return int(bool(args.strict and status != "BASELINE_PRESENT"))


if __name__ == "__main__":
    sys.exit(main())

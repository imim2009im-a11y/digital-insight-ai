#!/usr/bin/env python3
"""Free, offline-only static-site security regression audit.

Uses only Python stdlib. Reads tracked HTML from site/ without any HTTP requests,
scanner subscription, authentication, or uploads. Does not audit HTTP response
headers, server-side auth, dependencies, or detect all vulnerabilities.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1] / "site"
POST_DESTINATIONS = frozenset({"formspree.io"})
ACTIVE_URL_ATTRIBUTES = {
    "script": ("src",),
    "iframe": ("src",),
    "img": ("src",),
    "source": ("src", "srcset"),
    "video": ("src", "poster"),
    "audio": ("src",),
    "object": ("data",),
    "embed": ("src",),
}
DANGEROUS_URL_ATTRIBUTES = ("href", "src", "action", "formaction", "data")


class SecurityParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.findings: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): v or "" for k, v in attrs}
        for key, value in values.items():
            normalized = value.lstrip().lower()
            if key.startswith("on") and len(key) > 2:
                self.findings.append("INLINE_EVENT_HANDLER")
            if key in DANGEROUS_URL_ATTRIBUTES and normalized.startswith("javascript:"):
                self.findings.append("JAVASCRIPT_URL")
        if tag == "link" and "stylesheet" in values.get("rel", "").lower().split():
            active = ("href",)
        else:
            active = ACTIVE_URL_ATTRIBUTES.get(tag, ())
        for attr in active:
            if values.get(attr, "").strip().lower().startswith("http://"):
                self.findings.append("INSECURE_ACTIVE_RESOURCE")
        if tag == "form" and values.get("method", "get").strip().lower() == "post":
            action = values.get("action", "").strip()
            try:
                parsed = urlsplit(action)
                # Relative targets are allowed; they are same-origin by construction.
                if parsed.scheme or parsed.netloc:
                    if parsed.scheme != "https" or (parsed.hostname or "").lower() not in POST_DESTINATIONS:
                        self.findings.append("UNAPPROVED_POST_DESTINATION")
                    elif parsed.username or parsed.password or parsed.fragment:
                        self.findings.append("UNSAFE_POST_URL")
            except ValueError:
                self.findings.append("MALFORMED_POST_URL")


def audit_text(html: str) -> list[str]:
    parser = SecurityParser()
    parser.feed(html)
    parser.close()
    return parser.findings


def audit_directory(root: Path) -> list[tuple[str, str]]:
    """Return deterministic relative paths + violation types, never page contents."""
    if not root.is_dir():
        raise ValueError("static_site_directory_missing")
    findings = []
    base = root.resolve()
    for path in sorted(root.rglob("*.html")):
        if path.is_symlink() or not path.resolve().is_relative_to(base):
            findings.append((str(path.relative_to(root)), "UNSAFE_SYMLINK"))
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            findings.append((str(path.relative_to(root)), "UNREADABLE_HTML"))
            continue
        for code in sorted(set(audit_text(content))):
            findings.append((str(path.relative_to(root)), code))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    try:
        findings = audit_directory(args.root)
    except ValueError:
        print("OFFLINE_STATIC_SECURITY: INVALID_SITE_DIRECTORY")
        return 2
    if findings:
        for path, code in findings:
            print(f"{path}: {code}")
        print(f"OFFLINE_STATIC_SECURITY: FAIL ({len(findings)} categorized findings)")
        return 1
    print("OFFLINE_STATIC_SECURITY: PASS (HTML source checks only; no DAST or header verification)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Portable HTML fallbacks for legacy URLs on GitHub Pages.

GitHub Pages does not implement site/_redirects as HTTP 301 rules. These
HTML pages prevent 404 navigation and use an instant meta refresh as a
secondary migration measure, NEVER misrepresented as server-side 301.
No changes are made outside site/ on the current branch.
"""
import argparse
import html
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "site"
LEGACY_TARGETS = {
    "tools.html": "/tools/",
    "start.html": "/guides/",
    "methodology.html": "/about/",
    "editorial-policy/index.html": "/about/",
    "privacy-policy.html": "/privacy/",
    "best-ai-video-tools.html": "/reviews/",
    "kling-vs-runway.html": "/reviews/",
    "lovable-vs-v0.html": "/reviews/",
}


def validate_rules():
    lines = (ROOT / "_redirects").read_text(encoding="utf-8").splitlines()
    actual = {}
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        columns = line.split()
        if len(columns) != 3 or columns[2] != "301":
            raise ValueError("legacy mapping contains unsupported directive: " + line)
        original, destination, _ = columns
        if not original.startswith("/") or not destination.startswith("/"):
            raise ValueError("legacy aliases must use root-relative paths")
        source = original.lstrip("/") + ("index.html" if original.endswith("/") else "")
        if source in actual:
            raise ValueError("duplicate legacy alias: " + source)
        actual[source] = destination
    if actual != LEGACY_TARGETS:
        raise ValueError("configured migration aliases do not match approved mapping")
    return actual


def generate(destination):
    link = html.escape(destination, quote=True)
    canonical = html.escape("https://digitalinsightai.com" + destination, quote=True)
    return (
        '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<meta name="robots" content="noindex,follow">\n'
        '<meta http-equiv="refresh" content="0;url=' + link + '">\n'
        '<link rel="canonical" href="' + canonical + '">\n'
        '<title>انتقلت الصفحة | Digital Insight AI</title>\n'
        '</head>\n<body>\n<main>\n'
        '<h1>تم نقل هذه الصفحة</h1>\n'
        '<p>ستنتقل إلى القسم الجديد تلقائيًا. إذا لم يحدث ذلك، '
        '<a href="' + link + '">افتح القسم الجديد</a>.</p>\n'
        '</main>\n</body>\n</html>\n'
    )


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    args = parser.parse_args()
    mapping = validate_rules()
    mismatches = []
    for file_name, destination in mapping.items():
        filename = ROOT / file_name
        expected = generate(destination)
        existing = filename.read_text(encoding="utf-8") if filename.is_file() else None
        if existing == expected:
            continue
        if args.check:
            mismatches.append(file_name)
        else:
            filename.parent.mkdir(parents=True, exist_ok=True)
            filename.write_text(expected, encoding="utf-8")
            print("CREATED/UPDATED", file_name, "=>", destination)
    if mismatches:
        raise ValueError("legacy fallbacks need regeneration: " + ", ".join(mismatches))
    print("PASS:", len(mapping), "legacy HTML fallbacks. These are NOT real HTTP 301 responses.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print("FAIL:", exc, file=sys.stderr)
        sys.exit(1)

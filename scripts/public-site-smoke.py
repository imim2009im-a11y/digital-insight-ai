#!/usr/bin/env python3
"""Dependency-free public smoke monitor: read-only; no API keys, logs or PII."""
import re
import sys
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = "https://digitalinsightai.com"
HEADERS = {"User-Agent": "DigitalInsightAI-SiteQA/1.0", "Cache-Control": "no-cache"}

def fetch(url):
    error = None
    for attempt in range(3):
        try:
            request = Request(url, headers=HEADERS)
            with urlopen(request, timeout=14) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                final = response.geturl()
                if urlsplit(final).netloc != "digitalinsightai.com":
                    raise RuntimeError("unexpected redirect host")
                return response.read(1_500_000).decode("utf-8", errors="replace")
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(3)
    raise RuntimeError(f"{url}: {error}") from error

def main():
    failures = []
    robots = fetch(ROOT + "/robots.txt")
    if "Sitemap: " + ROOT + "/sitemap.xml" not in robots:
        failures.append("robots.txt does not announce the canonical sitemap")
    try:
        xml = ElementTree.fromstring(fetch(ROOT + "/sitemap.xml"))
    except ElementTree.ParseError as exc:
        raise SystemExit(f"Invalid sitemap: {exc}")
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls = [n.text for n in xml.findall(f"{ns}url/{ns}loc")]
    if not urls or len(urls) > 80 or len(urls) != len(set(urls)):
        failures.append("sitemap count/duplicates invalid")
    for url in urls:
        if not url or not url.startswith(ROOT + "/") or urlsplit(url).netloc != "digitalinsightai.com":
            failures.append(f"unexpected sitemap URL: {url}")
            continue
        try:
            html = fetch(url)
        except Exception as exc:
            failures.append(str(exc))
            continue
        if '<html lang="ar" dir="rtl">' not in html:
            failures.append(f"{url}: Arabic RTL HTML missing")
        if not re.search(r"<h1(?:\s|>)", html):
            failures.append(f"{url}: h1 missing")
        if f'rel="canonical" href="{url}"' not in html:
            failures.append(f"{url}: incorrect canonical")
        if not re.search(r'<meta name="description" content="[^"]+', html):
            failures.append(f"{url}: meta description missing")
        print(f"OK {url}", flush=True)
    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS {len(urls)} public canonical pages, robots and sitemap", flush=True)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Dependency-free public smoke monitor: read-only; no API keys, logs or PII."""
import re
import sys
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = "https://digitalinsightai.com"
LEGACY_ROOT = "https://imim2009im-a11y.github.io/digital-insight-ai"
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

def verify_legacy_redirect():
    """Require the retired GitHub Pages origin to resolve to the canonical domain."""
    request = Request(LEGACY_ROOT + "/", headers=HEADERS)
    with urlopen(request, timeout=14) as response:
        final = urlsplit(response.geturl())
        if response.status != 200:
            raise RuntimeError(f"legacy redirect ended with HTTP {response.status}")
        if final.scheme != "https" or final.netloc != "digitalinsightai.com" or final.path not in ("", "/"):
            raise RuntimeError(f"legacy origin resolved unexpectedly to {response.geturl()}")


def main():
    failures = []
    try:
        verify_legacy_redirect()
        print("OK legacy GitHub Pages origin redirects to canonical domain", flush=True)
    except Exception as exc:
        failures.append(f"legacy-domain redirect failure: {exc}")
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
    try:
        feed = ElementTree.fromstring(fetch(ROOT + "/news/feed.xml"))
        article_links = [n.text for n in feed.findall("channel/item/link")]
        indexed_news = [u for u in urls if u.startswith(ROOT + "/news/") and u != ROOT + "/news/"]
        if feed.tag != "rss" or set(article_links) != set(indexed_news):
            failures.append("RSS articles do not match sitemap news URLs")
    except (RuntimeError, ElementTree.ParseError) as exc:
        failures.append(f"RSS failure: {exc}")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS {len(urls)} public canonical pages, robots and sitemap", flush=True)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""IndexNow notification after public deployment; not a guarantee of indexing.

The publicly hosted proof file is a domain-ownership key, not a service credential.
The Google Indexing API is intentionally NOT used for general news pages.
"""
import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

HOST = "digitalinsightai.com"
ROOT = "https://" + HOST
SITE = Path("site")
UA = {"User-Agent": "DigitalInsightAI-IndexNow/1.0"}

def get_key():
    files = [p for p in SITE.glob("*.txt")
             if re.fullmatch(r"[0-9a-f]{48}", p.stem)
             and p.read_text(encoding="utf-8").strip() == p.stem]
    if len(files) != 1:
        raise ValueError("Expected exactly one valid public ownership key")
    return files[0].stem

def urls_from_sitemap():
    sitemap = ElementTree.parse(SITE / "sitemap.xml").getroot()
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls = [node.text for node in sitemap.findall(f"{ns}url/{ns}loc")]
    if not 1 <= len(urls) <= 1000 or len(set(urls)) != len(urls):
        raise ValueError("Invalid canonical sitemap URLs")
    for url in urls:
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.netloc != HOST or parts.query or parts.fragment:
            raise ValueError("Unexpected canonical URL")
    return urls

def changed_urls(urls, key):
    changed = subprocess.run(
        ["git", "diff", "--name-only", "HEAD^", "HEAD", "--", "site/"],
        check=True, capture_output=True, text=True).stdout.splitlines()
    # Announce full current sitemap only for new IndexNow ownership or sitemap changes.
    if f"site/{key}.txt" in changed or "site/sitemap.xml" in changed:
        return urls
    chosen = set()
    for filename in changed:
        if not filename.startswith("site/"):
            continue
        if filename == "site/index.html":
            chosen.add(ROOT + "/")
        elif filename.endswith("/index.html"):
            chosen.add(ROOT + "/" + filename.removeprefix("site/").removesuffix("index.html"))
    return [url for url in urls if url in chosen]

def prove_public_key(key):
    url = f"{ROOT}/{key}.txt"
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=UA), timeout=16) as response:
                if response.status == 200 and response.read(512).decode("utf-8").strip() == key:
                    return url
        except Exception:
            if attempt == 2:
                raise
        if attempt < 2:
            time.sleep(3)
    raise RuntimeError("Public ownership key missing or mismatched")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Explicit full submission")
    parser.add_argument("--dry-run", action="store_true", help="Validate locally; no network")
    args = parser.parse_args()
    key = get_key()
    urls = urls_from_sitemap()
    changed = urls if args.all else changed_urls(urls, key)
    if not changed:
        print("IndexNow: no changed canonical HTML URLs")
        return 0
    if args.dry_run:
        print(f"IndexNow preflight OK: {len(changed)} canonical URLs")
        return 0
    key_url = prove_public_key(key)
    payload = json.dumps({"host": HOST, "key": key, "keyLocation": key_url,
                          "urlList": changed}).encode("utf-8")
    request = Request("https://api.indexnow.org/indexnow", data=payload,
                      method="POST",
                      headers={"Content-Type": "application/json; charset=utf-8", **UA})
    with urlopen(request, timeout=25) as response:
        if response.status not in (200, 202):
            raise RuntimeError("IndexNow unexpected submission status")
        print(f"IndexNow HTTP {response.status}, {len(changed)} URLs received. "
              "This does not prove crawling or indexing.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("IndexNow error:", type(exc).__name__, str(exc).split("?")[0],
              file=sys.stderr)
        raise SystemExit(1)

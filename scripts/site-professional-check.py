#!/usr/bin/env python3
"""Site content checks: no external dependencies and no remote network calls."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit

ROOT = Path("site")
errors = []
def fail(path, issue):
    errors.append(f"{path}: {issue}")

class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = []
        self.h1 = 0
        self.refs = []
        self.meta = {}
        self.canonical = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "h1":
            self.h1 += 1
        if tag == "a" or tag == "script" or tag == "link":
            ref = d.get("href") if tag != "script" else d.get("src")
            if ref: self.refs.append(ref)
        if tag == "meta" and d.get("name"):
            self.meta[d["name"]] = d.get("content", "")
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical.append(d.get("href", ""))
    def handle_data(self, data):
        self.title.append(data)

canonical = set()
for f in sorted(ROOT.rglob("*.html")):
    # Google Search Console verification payload is intentionally not a web page.
    if f.name == "googlef5993c7e5ddbe3c2.html":
        continue
    text = f.read_text(encoding="utf-8")
    parser = Tags()
    parser.feed(text)
    if len(re.findall(r"<h1(?:\s|>)", text)) != 1:
        fail(f, "expected one h1")
    if 'lang="ar"' not in text or 'dir="rtl"' not in text:
        fail(f, "expected Arabic RTL document")
    if f.name == "404.html" or f == ROOT / "contact.html":
        continue
    if len(parser.canonical) != 1:
        fail(f, "expected one canonical")
    else:
        u = parser.canonical[0]
        if not u.startswith("https://digitalinsightai.com/"): fail(f, "unexpected canonical host")
        if u in canonical: fail(f, "duplicate canonical URL")
        canonical.add(u)
    if not parser.meta.get("description"):
        fail(f, "missing meta description")
    for ref in parser.refs:
        if ref.startswith(("#", "mailto:", "tel:", "data:", "javascript:")): continue
        url = urlsplit(ref)
        if url.scheme or url.netloc: continue
        dest = url.path
        if not dest: continue
        if dest.startswith("/"):
            target = ROOT / dest.lstrip("/")
        else:
            target = f.parent / dest
        if dest.endswith("/") or target.is_dir():
            target = target / "index.html"
        if not target.is_file(): fail(f, f"broken local asset/link: {ref}")
    for body in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>', text):
        try: json.loads(body)
        except json.JSONDecodeError as e: fail(f, f"invalid JSON-LD: {e}")

ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
tree = ET.parse(ROOT / "sitemap.xml")
urls = [n.text for n in tree.findall(f"{ns}url/{ns}loc")]
if set(urls) != canonical:
    missing = canonical - set(urls)
    extra = set(urls) - canonical
    if missing: errors.append(f"URLs missing from sitemap: {sorted(missing)}")
    if extra: errors.append(f"URLs without matching canonical: {sorted(extra)}")
if len(urls) != len(set(urls)): errors.append("duplicate sitemap URLs")
if "Sitemap: https://digitalinsightai.com/sitemap.xml" not in (ROOT / "robots.txt").read_text():
    errors.append("robots.txt sitemap mismatch")
for required in ("site/contact/index.html","site/assets/site.js","site/assets/icon.svg"):
    if not Path(required).is_file(): errors.append(f"missing required {required}")
# Preserve clear submission metadata and user consent on the contact page.
contact_html = (ROOT / "contact/index.html").read_text(encoding="utf-8")
for marker in ('name="form_name"', 'name="privacy_consent"', 'action="https://formspree.io/f/xeewzvkr"'):
    if marker not in contact_html:
        errors.append(f"Contact form is missing {marker}")
# Prevent hidden honeypot controls from creating huge horizontal RTL scrollbars.
css = (ROOT / "assets/styles.css").read_text(encoding="utf-8")
if "left:-99999" in css or "right:-99999" in css:
    errors.append("off-canvas honeypot CSS expands viewport scroll width")
if "clip-path:inset(50%)" not in css:
    errors.append("visually-hidden honeypot clipping missing")
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"PASS: {len(urls)} canonical URLs, RTL pages, JSON-LD and local links.")

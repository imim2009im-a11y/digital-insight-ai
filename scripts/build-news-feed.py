#!/usr/bin/env python3
"""Deterministic RSS 2.0 feed for original Arabic news, generated from Article JSON-LD."""
import argparse
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://digitalinsightai.com/news/"
NEWS = Path("site/news")
TARGET = NEWS / "feed.xml"

def read_items():
    entries = []
    for file in sorted(NEWS.glob("*/index.html")):
        matches = re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',
                             file.read_text(encoding="utf-8"))
        articles = [json.loads(value) for value in matches]
        news = next((value for value in articles if value.get("@type") == "NewsArticle"), None)
        if news is None:
            raise ValueError(f"Missing NewsArticle JSON-LD: {file}")
        url = news["mainEntityOfPage"]["@id"]
        if url != BASE + file.parent.name + "/":
            raise ValueError(f"Incorrect canonical: {file}")
        entries.append({"title": news["headline"], "description": news["description"],
                        "datePublished": news["datePublished"], "url": url})
    if not entries:
        raise ValueError("Feed requires at least one article")
    entries.sort(key=lambda v: (v["datePublished"], v["url"]), reverse=True)
    return entries

def render(entries):
    esc = lambda v: html.escape(str(v), quote=False)
    date = lambda v: datetime.fromisoformat(v).astimezone(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
             '  <channel>',
             '    <title>Digital Insight AI — أخبار الذكاء الاصطناعي</title>',
             f'    <link>{BASE}</link>',
             '    <description>تحليلات عربية أصلية موثقة من المصادر الرسمية حول الذكاء الاصطناعي والتقنيات.</description>',
             '    <language>ar-SA</language>',
             f'    <atom:link href="{BASE}feed.xml" rel="self" type="application/rss+xml" />',
             f'    <lastBuildDate>{date(entries[0]["datePublished"])}</lastBuildDate>']
    for article in entries:
        lines.extend(['    <item>',
                      f'      <title>{esc(article["title"])}</title>',
                      f'      <link>{esc(article["url"])}</link>',
                      f'      <guid isPermaLink="true">{esc(article["url"])}</guid>',
                      f'      <pubDate>{date(article["datePublished"])}</pubDate>',
                      f'      <description>{esc(article["description"])}</description>',
                      '    </item>'])
    return "\n".join(lines + ['  </channel>', '</rss>', ''])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    content = render(read_items())
    if args.write:
        TARGET.write_text(content, encoding="utf-8")
    elif not TARGET.exists() or TARGET.read_text(encoding="utf-8") != content:
        print("Outdated RSS: run python3 scripts/build-news-feed.py --write", file=sys.stderr)
        return 1
    print(f"RSS OK: {content.count('<item>')} source-backed news items")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

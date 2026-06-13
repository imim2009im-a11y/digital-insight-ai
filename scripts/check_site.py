#!/usr/bin/env python3
"""Validate the Digital Insight AI static site without third-party packages."""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = [
    "index.html",
    "start.html",
    "tools.html",
    "methodology.html",
    "best-ai-video-tools.html",
    "kling-vs-runway.html",
    "lovable-vs-v0.html",
    "article-ai-tools.html",
    "about.html",
    "contact.html",
    "privacy-policy.html",
]
CHECKED_PAGES = PUBLIC_PAGES + ["analytics.html", "launch.html", "404.html", "go/index.html"]
IGNORED_SCHEMES = {"http", "https", "mailto", "tel", "javascript", "data"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.ids: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False
        self.has_description = False
        self.html_lang = ""
        self.html_dir = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html":
            self.html_lang = values.get("lang", "") or ""
            self.html_dir = values.get("dir", "") or ""
        if tag == "title":
            self.in_title = True
        if tag == "meta" and (values.get("name") or "").lower() == "description":
            self.has_description = bool((values.get("content") or "").strip())
        if values.get("id"):
            self.ids.append(values["id"] or "")
        for attr in ("href", "src"):
            if values.get(attr):
                self.links.append(values[attr] or "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()


def parse_page(path: Path) -> PageParser:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target(source: Path, link: str) -> tuple[Path | None, str]:
    parsed = urlsplit(link.strip())
    if parsed.scheme.lower() in IGNORED_SCHEMES or parsed.netloc:
        return None, ""
    raw_path = unquote(parsed.path)
    if not raw_path:
        return source, parsed.fragment
    prefix = "/digital-insight-ai/"
    if raw_path.startswith(prefix):
        raw_path = raw_path[len(prefix):]
        target = ROOT / raw_path
    elif raw_path.startswith("/"):
        return None, ""
    else:
        target = source.parent / raw_path
    if raw_path.endswith("/"):
        target = target / "index.html"
    return target.resolve(), parsed.fragment


def main() -> int:
    errors: list[str] = []
    parsed_pages: dict[Path, PageParser] = {}

    for relative in CHECKED_PAGES:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing page: {relative}")
            continue
        parser = parse_page(path)
        parsed_pages[path.resolve()] = parser
        if parser.html_lang != "ar" or parser.html_dir != "rtl":
            errors.append(f"{relative}: expected html lang=ar and dir=rtl")
        if not parser.title:
            errors.append(f"{relative}: missing title")
        if relative != "go/index.html" and not parser.has_description:
            errors.append(f"{relative}: missing meta description")
        duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicates:
            errors.append(f"{relative}: duplicate ids: {', '.join(duplicates)}")

    for source, parser in list(parsed_pages.items()):
        for link in parser.links:
            target, fragment = local_target(source, link)
            if target is None:
                continue
            try:
                target.relative_to(ROOT)
            except ValueError:
                errors.append(f"{source.relative_to(ROOT)}: link escapes repository: {link}")
                continue
            if not target.exists():
                errors.append(f"{source.relative_to(ROOT)}: broken local link: {link}")
                continue
            if fragment and target.suffix.lower() == ".html":
                target_parser = parsed_pages.get(target) or parse_page(target)
                parsed_pages[target] = target_parser
                if fragment not in target_parser.ids:
                    errors.append(f"{source.relative_to(ROOT)}: missing fragment #{fragment} in {target.relative_to(ROOT)}")

    try:
        sitemap = ET.parse(ROOT / "sitemap.xml")
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locations = [node.text.strip() for node in sitemap.findall("sm:url/sm:loc", namespace) if node.text]
        expected = {
            "https://imim2009im-a11y.github.io/digital-insight-ai/" + ("" if page == "index.html" else page)
            for page in PUBLIC_PAGES
        }
        if set(locations) != expected:
            missing = sorted(expected - set(locations))
            extra = sorted(set(locations) - expected)
            if missing:
                errors.append("Sitemap missing: " + ", ".join(missing))
            if extra:
                errors.append("Sitemap has extra URLs: " + ", ".join(extra))
    except (ET.ParseError, OSError) as exc:
        errors.append(f"Invalid sitemap.xml: {exc}")

    try:
        tools = json.loads((ROOT / "tools-data.json").read_text(encoding="utf-8"))
        if not isinstance(tools, list) or not tools:
            errors.append("tools-data.json must contain a non-empty array")
        required = {"name", "category", "label", "bestFor", "strength", "caution", "url"}
        for index, tool in enumerate(tools):
            missing = required - set(tool) if isinstance(tool, dict) else required
            if missing:
                errors.append(f"tools-data.json item {index} missing: {', '.join(sorted(missing))}")
    except (json.JSONDecodeError, OSError) as exc:
        errors.append(f"Invalid tools-data.json: {exc}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    sitemap_lines = [line for line in robots.splitlines() if line.lower().startswith("sitemap:")]
    if sitemap_lines != ["Sitemap: https://imim2009im-a11y.github.io/digital-insight-ai/sitemap.xml"]:
        errors.append("robots.txt must advertise only the canonical sitemap.xml")

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Site checks passed for {len(CHECKED_PAGES)} HTML pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

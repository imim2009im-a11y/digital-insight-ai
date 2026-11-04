#!/usr/bin/env python3
"""Validate and render the static AI tools directory from its one JSON source.

No network requests or external dependencies; --check fails if HTML is out of sync.
Only use --write on an isolated development branch.
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "site/data/tools.json"
TARGET = ROOT / "site/tools/index.html"
BEGIN = "<!-- catalog:begin -->"
END = "<!-- catalog:end -->"
ALLOWED_CATEGORIES = {"video", "design", "apps", "marketing", "3d"}
UNKNOWN_KEYS = {"price", "arabicSupport", "privacy"}
FACT_KEYS = {"freePlan", "arabicVideoTranslation"}
OFFICIAL_FACT_HOSTS = {
    "runway": {"help.runwayml.com"},
    "heygen": {"www.heygen.com", "help.heygen.com"},
    "synthesia": {"help.synthesia.io"},
}


def validate(data):
    if data.get("version") != 1 or data.get("language") != "ar-SA":
        raise ValueError("unexpected catalog schema version or language")
    tools = data.get("tools")
    if not isinstance(tools, list) or not tools:
        raise ValueError("tools must be a nonempty array")
    seen = set()
    for tool in tools:
        key = tool.get("id")
        if not isinstance(key, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", key):
            raise ValueError("invalid tool id")
        if key in seen:
            raise ValueError("duplicate id " + key)
        seen.add(key)
        for field in ("name", "categoryLabel", "focus", "description"):
            if not isinstance(tool.get(field), str) or not tool[field].strip():
                raise ValueError(key + " missing " + field)
        if tool.get("category") not in ALLOWED_CATEGORIES:
            raise ValueError(key + " invalid category")
        unknown = tool.get("unknown")
        if not isinstance(unknown, dict) or set(unknown) != UNKNOWN_KEYS:
            raise ValueError(key + " unknown fields must be explicit")
        if any(value is not None for value in unknown.values()):
            raise ValueError(key + " unverified commercial facts cannot be asserted here")
        facts = tool.get("facts")
        if not isinstance(facts, dict) or set(facts) != FACT_KEYS:
            raise ValueError(key + " must list both fact types, including unknown")
        for fact_key, fact in facts.items():
            if fact is None:
                continue
            if key not in OFFICIAL_FACT_HOSTS:
                raise ValueError(key + " official fact source is not approved")
            if not isinstance(fact, dict) or set(fact) != {"available", "scope", "sourceUrl", "verifiedOn"}:
                raise ValueError(key + " invalid verified fact structure")
            if fact["available"] is not True or not isinstance(fact["scope"], str) or not fact["scope"].strip():
                raise ValueError(key + " invalid evidence scope")
            source = urlsplit(fact["sourceUrl"])
            if (source.scheme != "https" or source.hostname not in OFFICIAL_FACT_HOSTS[key]
                    or source.username or source.password or source.port not in (None, 443)
                    or not source.path or source.path == "/"):
                raise ValueError(key + " invalid official evidence source")
            if not re.fullmatch(r"20[0-9]{2}-[01][0-9]-[0-3][0-9]", fact["verifiedOn"]):
                raise ValueError(key + " invalid verification date")
        evidence = tool.get("evidence")
        if (not isinstance(evidence, dict)
                or evidence.get("sourceFile") != "site/tools/index.html"
                or evidence.get("origin") != "existing editorial directory"
                or evidence.get("externalVerificationDate") is not None):
            raise ValueError(key + " misleading or missing provenance")
        review = tool.get("review")
        if review is not None:
            if not isinstance(review, dict) or not re.fullmatch(r"\.\./reviews/[a-z0-9-]+/", review.get("href", "")):
                raise ValueError(key + " invalid local review link")
            if not review.get("label"):
                raise ValueError(key + " missing review label")
            target = (ROOT / "site/tools" / review["href"]).resolve()
            if not target.is_dir() or not (target / "index.html").is_file():
                raise ValueError(key + " review does not exist")
            if tool["description"].count("{review}") != 1:
                raise ValueError(key + " missing single review marker")
        elif "{review}" in tool["description"]:
            raise ValueError(key + " unexplained review marker")
        outbound = tool.get("external")
        if not isinstance(outbound, dict) or not isinstance(outbound.get("sponsored"), bool):
            raise ValueError(key + " invalid external action")
        if not isinstance(outbound.get("label"), str) or not outbound["label"]:
            raise ValueError(key + " missing outbound label")
        url = urlsplit(outbound.get("href", ""))
        if url.scheme != "https" or not url.netloc or url.username or url.password:
            raise ValueError(key + " external links must be valid HTTPS without credentials")
    return tools


def escaped(text):
    return html.escape(str(text), quote=True)


def render(data):
    cards = []
    for tool in validate(data):
        review = tool["review"]
        description = escaped(tool["description"])
        if review:
            review_link = '<a href="' + escaped(review["href"]) + '">' + escaped(review["label"]) + '</a>'
            description = description.replace("{review}", review_link)
        action = tool["external"]
        attributes = (' class="affiliate" data-tool="' + escaped(tool["name"]) + '"'
                      if action["sponsored"] else "")
        relation = "sponsored noopener noreferrer" if action["sponsored"] else "noopener noreferrer"
        review_ref = review["href"] if review else ""
        verification = []
        for fact_key, label in (("freePlan", "خطة مجانية موثقة"), ("arabicVideoTranslation", "ترجمة الفيديو بالعربية موثقة")):
            fact = tool["facts"][fact_key]
            if fact is not None:
                verification.append(
                    '<p class="tool-verified-fact">'
                    + escaped(label) + ': ' + escaped(fact["scope"])
                    + ' <a href="' + escaped(fact["sourceUrl"])
                    + '" target="_blank" rel="noopener noreferrer">المصدر الرسمي</a>'
                    + ' <small>تحقق: ' + escaped(fact["verifiedOn"]) + '</small></p>'
                )
        facts_html = ''.join(verification)
        cards.append(
            '<article data-tool-card data-tool-id="' + escaped(tool["id"]) + '"'
            ' id="tool-' + escaped(tool["id"]) + '"'
            ' data-category="' + escaped(tool["category"]) + '"'
            ' data-focus="' + escaped(tool["focus"]) + '"'
            ' data-review="' + escaped(review_ref) + '">'
            '<span>' + escaped(tool["categoryLabel"]) + '</span>'
            '<h2>' + escaped(tool["name"]) + '</h2>'
            '<p>' + description + '</p>'
            + facts_html
            '<a' + attributes + ' rel="' + relation + '" target="_blank" href="'
            + escaped(action["href"]) + '">' + escaped(action["label"]) + '</a>'
            '<div class="card-actions"><button class="compare-button" type="button"'
            ' aria-pressed="false">أضف للمقارنة</button></div></article>'
        )
    return '<div class="grid tools">\n' + '\n'.join(cards) + '\n</div>'


def main():
    args = argparse.ArgumentParser()
    action = args.add_mutually_exclusive_group(required=True)
    action.add_argument("--check", action="store_true")
    action.add_argument("--write", action="store_true")
    mode = args.parse_args()
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    rendered = render(data)
    existing = TARGET.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(BEGIN) + r"\n.*?\n" + re.escape(END), re.DOTALL)
    match = pattern.search(existing)
    if not match:
        if mode.check:
            raise ValueError("missing generated catalog delimiters")
        # Initial migration: replace exactly one original card group.
        initial = re.compile(r'<div class="grid tools">[\s\S]*?</div>\s*(?=<section id="value-check")')
        matches = list(initial.finditer(existing))
        if len(matches) != 1:
            raise ValueError("unable to uniquely locate the original tool card group")
        updated = initial.sub(lambda _: BEGIN + "\n" + rendered + "\n" + END + "\n", existing)
    else:
        if len(list(pattern.finditer(existing))) != 1:
            raise ValueError("duplicate catalog delimiters")
        updated = pattern.sub(lambda _: BEGIN + "\n" + rendered + "\n" + END, existing)
    if mode.check:
        if existing != updated:
            raise ValueError("tools HTML is stale; run python3 scripts/sync_tools_catalog.py --write")
        print("PASS: catalog schema, article links and generated HTML match " + str(len(data["tools"])) + " tools")
    elif existing != updated:
        TARGET.write_text(updated, encoding="utf-8")
        print("UPDATED: tools HTML generated from catalog")
    else:
        print("UNCHANGED: tools HTML already synchronized")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print("FAIL: " + str(exc), file=sys.stderr)
        sys.exit(1)

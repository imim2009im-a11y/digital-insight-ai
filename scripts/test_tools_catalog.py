#!/usr/bin/env python3
"""Regression checks for the canonical tools JSON and safe static HTML renderer."""
import copy
import json
import unittest
from sync_tools_catalog import CATALOG, render, validate


class CatalogValidationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(CATALOG.read_text(encoding="utf-8"))

    def test_current_catalog_is_complete_without_commercial_guesses(self):
        entries = validate(self.data)
        self.assertEqual(len(entries), 11)
        self.assertEqual(len({entry["id"] for entry in entries}), 11)
        for entry in entries:
            self.assertTrue(all(value is None for value in entry["unknown"].values()))

    def test_html_special_characters_are_escaped(self):
        data = copy.deepcopy(self.data)
        data["tools"][0]["name"] = '<img src=x onerror="alert(1)">'
        page = render(data)
        self.assertNotIn('<img src=x', page)
        self.assertIn('&lt;img src=x', page)

    def test_duplicate_tool_ids_are_rejected(self):
        data = copy.deepcopy(self.data)
        data["tools"][1]["id"] = data["tools"][0]["id"]
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validate(data)

    def test_non_https_or_script_actions_are_rejected(self):
        for href in ('javascript:alert(1)', 'http://example.test', 'https://me:password@example.test'):
            data = copy.deepcopy(self.data)
            data["tools"][0]["external"]["href"] = href
            with self.subTest(href=href):
                with self.assertRaises(ValueError):
                    validate(data)

    def test_unverified_claims_cannot_be_published_without_schema_review(self):
        data = copy.deepcopy(self.data)
        data["tools"][0]["unknown"]["freePlan"] = True
        with self.assertRaisesRegex(ValueError, "unverified"):
            validate(data)


if __name__ == "__main__":
    unittest.main()

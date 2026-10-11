import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import youtube_source_intelligence as y

class IngestionTests(unittest.TestCase):
    def test_collection_preserves_origin_and_video_publish_date(self):
        responses = [
            {"items": [{"id": "UCfixture", "contentDetails": {"relatedPlaylists": {"uploads": "UUfixture"}}}]},
            {"items": [{"snippet": {"resourceId": {"videoId": "aBcDeFgHijk"},
                                    "publishedAt": "2026-10-10T00:00:00Z", "title": "AI agent"},
                         "contentDetails": {"videoPublishedAt": "2026-09-01T00:00:00Z"}}]}
        ]
        with patch.object(y, "api", side_effect=responses) as api:
            items = y.collect([{"handle": "@example"}], "test-key", 20)
        records, _ = y.process(items, [])
        self.assertEqual(records[0]["channel_id"], "UCfixture")
        self.assertEqual(records[0]["published_at"], "2026-09-01T00:00:00Z")
        self.assertEqual(api.call_args_list[1].args[1]["part"], "snippet,contentDetails")

    def test_missing_video_date_does_not_use_playlist_date(self):
        responses = [
            {"items": [{"id": "UCfixture", "contentDetails": {"relatedPlaylists": {"uploads": "UUfixture"}}}]},
            {"items": [{"snippet": {"resourceId": {"videoId": "aBcDeFgHijk"}, "publishedAt": "2026-10-10"}}]}
        ]
        with patch.object(y, "api", side_effect=responses):
            self.assertEqual(y.collect([{"handle": "example"}], "test-key", 1)[0]["published_at"], "")

    def test_limit_rejected_before_network(self):
        with patch.object(y, "api") as api:
            for limit in (0, -1, 51):
                with self.assertRaises(ValueError):
                    y.collect([], "test-key", limit)
            api.assert_not_called()

    def test_unresolved_channel_stops_collection(self):
        with patch.object(y, "api", return_value={"items": []}):
            with self.assertRaisesRegex(RuntimeError, "Channel not resolved"):
                y.collect([{"handle": "missing"}], "test-key", 1)

    def test_dedup_and_categories(self):
        incoming = json.loads((ROOT / "tests/fixtures/youtube-videos.json").read_text())
        first, added = y.process(incoming, [])
        self.assertEqual((len(first), added), (1, 1))
        self.assertIn("automation", first[0]["topics"])
        second, added_again = y.process(incoming, first)
        self.assertEqual(added_again, 0)
        self.assertEqual(first, second)
        self.assertFalse(first[0]["claims_tested"])

    def test_bad_video_id_ignored(self):
        records, count = y.process([{"video_id":"not-a-valid-youtube-id"}], [])
        self.assertEqual((records, count), ([], 0))

    def test_cli_fixture_output(self):
        with tempfile.TemporaryDirectory() as d:
            output = pathlib.Path(d) / "output.json"
            subprocess.run([sys.executable, str(ROOT / "scripts/youtube_source_intelligence.py"),
                            "--fixture", str(ROOT / "tests/fixtures/youtube-videos.json"),
                            "--output", str(output)], cwd=ROOT, check=True, capture_output=True)
            data = json.loads(output.read_text())
            self.assertEqual(data["new"], 1)
            self.assertEqual(data["mode"], "fixture")

if __name__ == "__main__":
    unittest.main()

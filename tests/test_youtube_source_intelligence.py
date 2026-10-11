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
    def test_live_state_survives_two_runs_without_duplicates(self):
        incoming = json.loads((ROOT / "tests/fixtures/youtube-videos.json").read_text())
        with tempfile.TemporaryDirectory() as d:
            state = pathlib.Path(d) / "nested/state.json"
            output = pathlib.Path(d) / "report.json"
            argv = ["collector", "--sources", str(ROOT / "docs/research-sources/youtube-channels.json"),
                    "--state", str(state), "--output", str(output), "--write-state"]
            with patch.object(sys, "argv", argv), patch.dict(y.os.environ, {"YOUTUBE_API_KEY": "test-key"}), patch.object(y, "collect", return_value=incoming):
                y.main()
                y.main()
            self.assertEqual(json.loads(output.read_text())["new"], 0)
            self.assertEqual(len(json.loads(state.read_text())), 1)
            self.assertFalse(json.loads(state.read_text())[0]["claims_tested"])

    def test_failed_replacement_preserves_existing_state(self):
        with tempfile.TemporaryDirectory() as d:
            state = pathlib.Path(d) / "state.json"
            state.write_text('[{"existing": true}]')
            with patch.object(y.os, "replace", side_effect=OSError("disk failure")):
                with self.assertRaises(OSError):
                    y.write_json_atomic(state, [])
            self.assertEqual(state.read_text(), '[{"existing": true}]')
            self.assertEqual(list(pathlib.Path(d).iterdir()), [state])

    def test_fixture_cannot_write_state(self):
        with patch.object(sys, "argv", ["collector", "--fixture", "fixture.json", "--write-state"]):
            with self.assertRaises(SystemExit) as error:
                y.main()
            self.assertEqual(error.exception.code, 2)

    def test_output_cannot_overwrite_state(self):
        with patch.object(sys, "argv", ["collector", "--state", "same.json", "--output", "same.json"]):
            with self.assertRaises(SystemExit) as error:
                y.main()
            self.assertEqual(error.exception.code, 2)

    def test_collection_failure_preserves_report_and_state(self):
        with tempfile.TemporaryDirectory() as d:
            state = pathlib.Path(d) / "state.json"
            output = pathlib.Path(d) / "report.json"
            state.write_text("[]")
            output.write_text('{"previous": true}')
            argv = ["collector", "--sources", str(ROOT / "docs/research-sources/youtube-channels.json"),
                    "--state", str(state), "--output", str(output), "--write-state"]
            with patch.object(sys, "argv", argv), patch.dict(y.os.environ, {"YOUTUBE_API_KEY": "test-key"}), patch.object(y, "collect", side_effect=RuntimeError("unresolved")):
                with self.assertRaises(RuntimeError):
                    y.main()
            self.assertEqual(state.read_text(), "[]")
            self.assertEqual(output.read_text(), '{"previous": true}')

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

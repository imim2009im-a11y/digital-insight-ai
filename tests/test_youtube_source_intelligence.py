import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import youtube_source_intelligence as y

class IngestionTests(unittest.TestCase):
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

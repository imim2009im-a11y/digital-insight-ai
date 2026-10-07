import fcntl
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest

from ia_preflight import bounded_check, verify


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.state = self.root / ".git" / "ia-preflight"
        (self.root / "source").write_text("one")
        self.calls = 0

    def passing(self, root, timeout):
        self.calls += 1
        return "passed", 0, 0.01

    def test_resume_and_invalidation(self):
        self.assertEqual(verify(self.root, self.state, check=self.passing)["status"], "passed")
        self.assertEqual(verify(self.root, self.state, resume=True, check=self.passing)["status"], "reused")
        self.assertEqual(self.calls, 1)
        (self.root / "source").write_text("two")
        self.assertEqual(verify(self.root, self.state, resume=True, check=self.passing)["status"], "passed")
        self.assertEqual(self.calls, 2)

    def test_failure_retry_is_bounded_and_not_reused(self):
        def fail(root, timeout):
            self.calls += 1
            return "failed", 2, 0.01
        result = verify(self.root, self.state, attempts=3, check=fail)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(self.calls, 3)
        self.assertEqual(verify(self.root, self.state, resume=True, check=self.passing)["status"], "passed")

    def test_index_change_invalidates_cached_diff_check(self):
        def git(*args):
            subprocess.run(["git", *args], cwd=self.root, check=True, stdout=subprocess.DEVNULL)
        git("add", "source")
        git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "baseline")
        (self.root / "source").write_text("two  \n")
        git("add", "source")
        def diff_check(root, timeout):
            code = subprocess.run(["git", "diff", "--check"], cwd=root, stdout=subprocess.DEVNULL).returncode
            return "passed" if code == 0 else "failed", code, 0.01
        self.assertEqual(verify(self.root, self.state, check=diff_check)["status"], "passed")
        git("reset", "-q", "HEAD", "--", "source")
        self.assertEqual(verify(self.root, self.state, resume=True, check=diff_check)["status"], "failed")

    def test_concurrent_run_blocked(self):
        self.state.mkdir()
        with (self.state / "lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(verify(self.root, self.state, check=self.passing)["reason"], "already_running")
        self.assertEqual(self.calls, 0)

    def test_changed_source_not_cached(self):
        def mutate(root, timeout):
            (root / "source").write_text("changed")
            return self.passing(root, timeout)
        self.assertEqual(verify(self.root, self.state, check=mutate)["status"], "source_changed")
        self.assertEqual(verify(self.root, self.state, resume=True, check=self.passing)["status"], "passed")

    def test_timeout_and_output_not_stored(self):
        (self.root / "scripts").mkdir()
        (self.root / "scripts/agent-verify.sh").write_text("echo confidential-test-value; sleep 5\n")
        result = verify(self.root, self.state, timeout=1)
        self.assertEqual(result["status"], "timeout")
        self.assertLess(result["duration_seconds"], 3)
        self.assertNotIn(b"confidential-test-value", (self.state / "state.sqlite3").read_bytes())

    def test_production_disabled(self):
        (self.root / "scripts").mkdir()
        (self.root / "scripts/agent-verify.sh").write_text('test "$AGENT_VERIFY_PRODUCTION" = 0 && test "$AGENT_VERIFY_DOCKER" = 0\n')
        self.assertEqual(bounded_check(self.root, 1)[0], "passed")

    def test_limits_rejected(self):
        for kwargs in ({"timeout": 0}, {"timeout": 601}, {"attempts": 4}):
            with self.assertRaises(ValueError):
                verify(self.root, self.state, **kwargs)


if __name__ == "__main__":
    unittest.main()

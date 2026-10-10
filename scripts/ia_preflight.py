#!/usr/bin/env python3
"""Bounded, resumable source verification. No provider writes or model calls."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time


def fingerprint(root):
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=root
    ).split(b"\0")
    digest = hashlib.sha256()
    # git diff --check depends on the index, even with identical working bytes.
    digest.update(subprocess.check_output(["git", "ls-files", "--stage", "-z"], cwd=root))
    for raw in sorted(set(paths) - {b""}):
        path = root / os.fsdecode(raw)
        digest.update(raw + b"\0")
        if path.is_symlink():
            digest.update(b"link:" + os.fsencode(os.readlink(path)))
        elif path.is_file():
            digest.update(b"file:" + str(path.stat().st_mode).encode())
            with path.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
        else:
            digest.update(b"missing")
    return digest.hexdigest()


def runtime_signature():
    """Hash tool identity/version without persisting paths or environment values."""
    digest = hashlib.sha256(sys.version.encode())
    digest.update(os.fsencode(sys.executable))
    digest.update(os.fsencode(os.environ.get("PATH", "")))
    for command in ("git", "node", "bash", "python3"):
        executable = shutil.which(command)
        if executable is None:
            raise ValueError("required runtime tool unavailable")
        digest.update(os.fsencode(executable))
        try:
            result = subprocess.run(
                [executable, "--version"], stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL, timeout=5, check=True,
            )
        except (OSError, subprocess.SubprocessError):
            raise ValueError("runtime identity probe failed") from None
        digest.update(result.stdout)
    return digest.hexdigest()


def write_report(result, destination):
    """Atomically publish only known non-sensitive execution fields."""
    allowed = ("status", "reason", "run_id", "fingerprint", "runtime_fingerprint", "exit_code", "duration_seconds")
    report = {key: result[key] for key in allowed if key in result}
    report["schema_version"] = 1
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=destination.parent, delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(report, handle, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def bounded_check(root, timeout):
    # Fixed command; callers cannot supply shell commands or enable production checks.
    env = {k: os.environ[k] for k in ("PATH", "LANG", "LC_ALL", "SYSTEMROOT") if k in os.environ}
    env.update(AGENT_VERIFY_PRODUCTION="0", AGENT_VERIFY_DOCKER="0", PYTHONDONTWRITEBYTECODE="1")
    started = time.monotonic()
    with subprocess.Popen(
        ["bash", "scripts/agent-verify.sh"], cwd=root, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True,
    ) as process:
        try:
            code = process.wait(timeout=timeout)
            status = "passed" if code == 0 else "failed"
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            code, status = None, "timeout"
    return status, code, round(time.monotonic() - started, 3)


def verify(root, state_dir, timeout=120, attempts=1, resume=False, check=bounded_check):
    if not 1 <= timeout <= 600 or not 1 <= attempts <= 3:
        raise ValueError("timeout must be 1..600 seconds; attempts must be 1..3")
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state_dir / "lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {"status": "blocked", "reason": "already_running"}
        runtime_key = runtime_signature()
        source_key = fingerprint(root)
        key = hashlib.sha256((source_key + runtime_key).encode()).hexdigest()
        with sqlite3.connect(state_dir / "state.sqlite3") as db:
            db.execute("CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, fingerprint TEXT, status TEXT, exit_code INTEGER, duration REAL, timestamp TEXT DEFAULT CURRENT_TIMESTAMP)")
            # Holding the checkout lock proves no prior invocation is still active.
            db.execute("UPDATE runs SET status='interrupted' WHERE status='running'")
            db.commit()
            prior = db.execute("SELECT id FROM runs WHERE fingerprint=? AND status='passed' ORDER BY id DESC LIMIT 1", (key,)).fetchone()
            if resume and prior:
                result = {"status": "reused", "run_id": prior[0], "fingerprint": key, "runtime_fingerprint": runtime_key}
                write_report(result, state_dir / "evidence.json")
                return result
            for _ in range(attempts):
                cursor = db.execute("INSERT INTO runs(fingerprint,status) VALUES (?, 'running')", (key,))
                run_id = cursor.lastrowid
                db.commit()  # Interrupted runs are retained and never reused as successful.
                try:
                    status, code, duration = check(root, timeout)
                except (OSError, subprocess.SubprocessError):
                    status, code, duration = "error", None, None
                if fingerprint(root) != source_key:
                    status = "source_changed"
                db.execute("UPDATE runs SET status=?, exit_code=?, duration=? WHERE id=?", (status, code, duration, run_id))
                db.commit()
                result = {"status": status, "run_id": run_id, "fingerprint": key, "runtime_fingerprint": runtime_key, "exit_code": code, "duration_seconds": duration}
                if status in ("passed", "source_changed"):
                    break
            write_report(result, state_dir / "evidence.json")
            return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--attempts", type=int, default=1)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    git_dir = Path(subprocess.check_output(["git", "rev-parse", "--absolute-git-dir"], text=True).strip())
    try:
        result = verify(root, git_dir / "ia-preflight", args.timeout, args.attempts, args.resume)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] in ("passed", "reused") else 1


if __name__ == "__main__":
    raise SystemExit(main())

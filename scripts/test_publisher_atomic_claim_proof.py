#!/usr/bin/env python3
"""Offline atomic job-claim reference test. No accounts, secrets, or network access.

SQLite is a LOCAL PROOF ONLY. This must never be interpreted as durable storage
on Render Free, nor as an exactly-once external publishing guarantee.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import time
import uuid


def connect(path):
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


def claim(path, job_id):
    conn = connect(path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        token = str(uuid.uuid4())
        row = conn.execute(
            "UPDATE jobs SET status='CLAIMED', claim_token=?, attempts=attempts+1 "
            "WHERE id=? AND status='SCHEDULED' AND scheduled_at<=? RETURNING id",
            (token, job_id, int(time.time())),
        ).fetchone()
        conn.execute("COMMIT")
        return row is not None
    except Exception:
        if conn.in_transaction:
            conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()


def main():
    with TemporaryDirectory(prefix="publisher-atomic-claim-proof-") as directory:
        path = str(Path(directory) / "outbox.sqlite")
        conn = connect(path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            "CREATE TABLE jobs("
            "id TEXT PRIMARY KEY, status TEXT NOT NULL, scheduled_at INTEGER NOT NULL, "
            "claim_token TEXT, attempts INTEGER NOT NULL DEFAULT 0)"
        )
        conn.execute(
            "INSERT INTO jobs(id,status,scheduled_at) VALUES('synthetic-1','SCHEDULED',?)",
            (int(time.time()) - 10,),
        )
        conn.close()

        with ThreadPoolExecutor(max_workers=20) as pool:
            outcomes = list(pool.map(lambda _: claim(path, "synthetic-1"), range(64)))

        conn = connect(path)
        state = conn.execute(
            "SELECT status, attempts FROM jobs WHERE id='synthetic-1'"
        ).fetchone()
        conn.close()
        assert sum(outcomes) == 1, "Expected exactly one atomic claim"
        assert state == ("CLAIMED", 1), "Expected one persisted attempt"

        # Reopen after a simulated process crash: no automatic re-claim or send.
        assert not claim(path, "synthetic-1")
        conn = connect(path)
        assert conn.execute(
            "SELECT status, attempts FROM jobs WHERE id='synthetic-1'"
        ).fetchone() == ("CLAIMED", 1)
        conn.execute(
            "UPDATE jobs SET status='REVIEW_REQUIRED' "
            "WHERE id='synthetic-1' AND status='CLAIMED'"
        )
        conn.close()
        assert not claim(path, "synthetic-1")
        print("PASS: contenders=64 successful_claims=1 attempts=1 "
              "restart_reclaim=0 review_reclaim=0")
        print("LIMITATION: SQLite simulation only; external delivery and "
              "Render storage are not verified")


if __name__ == "__main__":
    main()

# Publisher durable outbox — verified alternatives (2026-11-10)

Status: **DESIGN + ISOLATED PROOF ONLY**. No live jobs executed, no database connected,
no new paid resources provisioned, and no production migrations or secrets changed.

## Incident boundary

- `main` still invokes `POST /api/run-due` and has recorded HTTP 401; a healthy
  `GET /api/health` does **not** prove scheduler credentials match.
- Live Publisher reports `persistence: "ephemeral-file"`. Render Free web-service
  files do not survive restart, idle spin-down or redeploy.
- PR #109 proposes monitoring-only containment; PR #110 proposes fail-closed
  Publisher hardening. Neither is a production data recovery or durable datastore.
- Inventory, recoverable export, provider acknowledgment reconciliation,
  and final owner approval must precede any deployment, credential rotation or replay.

## Four options (not interchangeable)

| Option | Benefits | Blocking verification |
|---|---|---|
| Existing MongoDB Atlas Free cluster | No new service; conditional atomic claim using `findOneAndUpdate` | Separate scoped database/account, network allowlist, quotas (512 MB free tier), backup/restore, live state export |
| Neon Postgres Free | SQL conditional UPDATE with transactions; free tier offers 1 GB/project | New integration/account authorization, connection resiliency, quotas, backup/restore |
| Cloudflare D1 Free | Durable SQLite-compatible managed SQL; separate Worker scheduling design | New integration, Workers auth and request budget, transaction/claim semantics require D1-specific tests |
| SQLite on Manjaro | Offline test/backup rehearsal without spending | Computer uptime and network; **not** a production datastore for Render; do not expose via public tunnel |

**Decision:** Prefer testing an isolated database in an existing Atlas Free cluster only
after capacity/security checks. Do not reuse another application's collections.
Postgres/Neon or D1 are independent alternatives if constraints fail. Keep all
real auto-publishing disabled until gate criteria below pass.

## Tested claim reference

`python3 scripts/test_publisher_atomic_claim_proof.py`

This standard-library-only local test uses a temporary SQLite file, a unique job
identifier, `BEGIN IMMEDIATE`, a conditional `UPDATE ... RETURNING`, 64
concurrent contenders, restart/reopen, and manual review state. Expected output:

```text
PASS: contenders=64 successful_claims=1 attempts=1 restart_reclaim=0 review_reclaim=0
```

**What the proof establishes:** One worker can claim one scheduled row
atomically in SQLite, and the claimed row survives a simulated process restart.
It does **not** test MongoDB Atlas, Neon, Cloudflare D1, Render deployment,
Telegram, Discord or real external acknowledgments. It **does not** guarantee
exactly-once external delivery (network acknowledgment ambiguity remains).

## Proposed fail-closed production contract

1. Separate tables/collections for posts, jobs, audit records and migration metadata.
2. Stable idempotency key and unique job identifier per publish intent.
3. Conditional atomic claim from `SCHEDULED` into `CLAIMED`, with
   attempt number, lease expiry, random claim token and audit transaction.
4. Only specifically approved job IDs may be attempted; never auto-replay the
   unknown backlog.
5. If the worker crashes during an external call, move uncertain work to
   `REVIEW_REQUIRED` with provider reconciliation before any retry.
6. If the database, schema or backup is unavailable, **fail closed**; never
   switch silently to ephemeral JSON or clear a queue.
7. Use separate least-privilege DB credentials, TLS, bounded connections,
   no public secrets and no unsafe inbound allow-all configuration.

## Required acceptance / no-go checks

- [ ] Identify the live Publisher owner and verify its current deployed commit.
- [ ] Inventory pending/due/ambiguous jobs through authorized private access.
- [ ] Take an approved export and verify an isolated restore and checksum.
- [ ] Prove database isolation, permissions, capacity, backup and billing limits.
- [ ] Reproduce conditional claim under two live test clients (synthetic data).
- [ ] Reconcile ambiguous provider acknowledgments without duplicate posts.
- [ ] Verify test-only authorized workflow, negative auth cases, and rollback.
- [ ] Obtain explicit approval before production deploy/restart, credential
      changes, real job release, or scheduled automation.

A passing HTTP health probe, a passing isolated regression, a public GitHub
comment or an empty new database does not satisfy these gates.

## Source documents

- Render Free limitations: https://render.com/docs/free
- MDN proxy forwarding trust: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
- MongoDB Atlas Free cluster limits: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- Neon free plan: https://neon.com/blog/neon-free-plan-1-gb-per-project
- Cloudflare D1 Free: https://developers.cloudflare.com/d1/reference/faq/

## Scope of this PR

Only a documentation decision record and a self-contained, synthetic offline
proof. No new production dependencies, DNS changes, billing changes or real
publishing behavior.

# Publisher safety-hardening release gates (not production-approved)

**Date:** 2026-10-31. **Status:** draft PR only. Do not merge `codex/publisher-readonly-preflight-20261031` into `digital-insight-publisher` without an independently verified backup and an explicit authorized release decision. Render auto-deploys on that branch.

## Implemented code defenses (scope and limitations)

1. **Startup fails closed:** a missing production `publisher/data/store.json` returns `503 publisher_state_unavailable`. A damaged state also returns 503 and is never silently replaced. The only empty-state bootstrap is **synthetic tests** with both `NODE_ENV=test` and `DIA_ALLOW_EMPTY_STATE_BOOTSTRAP=ISOLATED_TEST_ONLY`. Neither setting belongs on Render production.
2. **Single-process state lock:** requests that create/schedule/publish/change settings and read the authorized state are serialized. This protects the current single Node.js process from a lost-update race when external publishing awaits a response. **It is not a distributed lock, crash-safe journal or a durability guarantee.** During a slow external send, administrative state requests can queue.
3. **No duplicate jobs per post:** both schedule and manual publish reject an existing job with `409 post_already_has_job`. A previous `FAILED` job also blocks automatic retry until a deliberate recovery workflow is built. Older duplicates already in the datastore are not removed.
4. **Two automatic-publishing gates:** when due jobs exist, `/api/run-due` requires both `settings.safeMode===false` (chosen by an authenticated administrator) **and** the separate server-side `DIA_AUTO_PUBLISH_ENABLED=true` setting. The latter is **absent/false by default**. Token parity alone is insufficient to resume delivery. Changes to that environment setting can trigger a Render restart: complete a live backup and review pending jobs **before** any such configuration action.
5. **Manual publishing:** requires `confirm:true`; the server will reject posts already linked to any job. UI lists existing jobs without a re-publish button and offers the operation only for unused drafts. Provider failures are still possible; do not automatically retry uncertain deliveries.
6. **Session lifecycle:** each login issues an independent cryptographically random session value; the server stores only its HMAC digest and expiry, supports per-session logout revocation and expires after 12h. This store is **in memory and single-instance**; all sessions are invalidated by restart, which is conservative but can inconvenience administrators. Existing deterministic legacy cookies will no longer be accepted.
7. **Interrupted outbound sends:** an `executeJob` interrupted in `PUBLISHING` can remain ambiguous. Protected preflight counts `unverifiedJobs` and sets `manualReviewRequired`, but deliberately never retries or changes such jobs. Do not infer an external provider didn't publish merely because no final local acknowledgment exists.
8. **Scheduler credential probe:** `/api/scheduler/check` verifies the bearer token without executing jobs; private values aren't returned. This probe does not prove future job delivery or durable storage.
9. **Log/health semantics:** `/api/health` is a process/data-read check, not proof of scheduling readiness, provider delivery or successful restoration.

## Required staging acceptance

- Restore a **real authorized snapshot** into an isolated environment; verify expected post/job counts, a checksum and recoverable provider acknowledgment history.
- Verify **zero unintended publications** at bootstrap, after auth reconciliation, and after a restart.
- Verify concurrent create/schedule and overlapping outbound wait, including failed/timeouts, on a synthetic datastore. Existing tests cover overlapping API requests but not real provider delivery or multi-process concurrency.
- Verify missing and corrupt state return 503 without overwriting the file. A 503 on Render after deployment is an **incident to investigate**, not a reason to bootstrap an empty queue.
- Verify separate fresh login tokens, per-session revocation, expiration, rejected old legacy sessions and malformed/unknown cookies.
- Verify a scheduled overdue job stays blocked with `safeMode=true`; stays blocked if `safeMode=false` but `DIA_AUTO_PUBLISH_ENABLED` is absent; proceed only after explicit queue approval and recorded configuration authorizations.
- Verify no job created twice for a post and no implicit replay of ambiguous `PUBLISHING` jobs.
- Design **durable data with atomic job claiming**, crash recovery, provider-side reconciliation and restricted network access **before** relying on automatic publishing. Free-tier databases are conditional options, not a proven durable backup.

## Release criteria and rollback

1. Confirm the live inventory and explicit data-loss decision if nothing is recoverable.
2. Confirm a verified encrypted export and successful independent restore.
3. Confirm the one owner of release approvals and recorded approval of each destination, old queue, credential and automation flag.
4. Confirm monitoring distinguishes HTTP availability from publishing and delivery, with a maximum safe backlog processing rate.
5. Deploy in a controlled change window only when the above are true; do not use a merge as a surprise auto-deploy.
6. If verification fails, stop publication, preserve state and logs, and do not rerun /api/run-due or re-bootstrap data. Reverting code cannot restore missing ephemeral files.

**Unresolved / deliberate NO-GO:** Render Free's local file state is ephemeral; atomic claiming, exactly-once cross-provider delivery, durable backup, X-Forwarded-For trust analysis, CSRF formal review, Cloudflare TLS/DNS ownership, and real user data recovery are not implemented or proven by these source tests.

# Publisher — durable state migration (no automatic production change)

**Prepared:** 2026-10-31 | **Stage:** architecture and release plan only | **Risk:** HIGH.
This document is deliberately generic: do not publish internal allowlists, database connection strings, user data, account IDs, or credentials.

## Verified engineering context

- The Render Free publisher currently stores posts, scheduled jobs and audit records in a JSON file under the deployment filesystem; the provider documents that this filesystem is **ephemeral** on restart, redeploy and idle spin-down ([Render Free docs](https://render.com/docs/free)).
- Several existing storage projects are available through connected accounts, including Free-tier MongoDB Atlas clusters. **Their current contents, capacity, backup status, network reachability and ownership for Publisher are not verified.** Never reuse another application's database merely because it exists.
- Atlas Free has constrained storage, throughput and network limits ([Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)).
- Atlas Free backups are **not assumed included**: the documented optional snapshot feature has a charge ([Free Cluster Backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/)). Under this project's no-new-cost policy, do not activate that feature without a separate cost decision.

## Metadata-only check of candidate existing storage

- A connected Free-tier Atlas cluster in the EU was reachable during a **read-only** inventory on 2026-10-31.
- Its existing application database already contains several collections and records; it is **not an empty, dedicated Publisher database**. No collection contents, credentials or user rows were retrieved.
- **Decision:** do not reuse the existing application's database, collections, identities or backups for Publisher. A distinct database within an existing Free cluster is only a **candidate**, conditional on isolated least-privilege credentials, adequate remaining capacity, restricted access, an export/restore plan and owner approval. Shared cluster capacity still creates contention and recovery risk.
- No DB writes, collection creation, membership/network changes or chargeable backup features were executed.

## Preferred no-new-service design (conditional)

1. **Inventory and recover first.** Through an already authorized admin session, determine whether the Render instance currently has posts, pending/overdue jobs and publish attempts. Create a protected export with a verified SHA-256 and restore test. If state has already been lost, explicitly record the loss; an empty new database is not a backup.
2. **Select an existing isolated datastore.** Evaluate a healthy Free cluster in the same region as the Render app, only if remaining capacity and access policy permit. Use an application-specific database and least-privilege identity. Do not restore inactive Supabase projects or provision new paid infrastructure merely for testing.
3. **Restrict network egress/ingress.** Render publishes **region-specific shared outbound CIDR ranges** that can be allowlisted in Atlas ([Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses), [Render/Atlas guide](https://render.com/docs/connect-to-mongodb-atlas)). Never replace a restrictive access list with unrestricted internet access as a shortcut. Verify ranges from the live service dashboard before any change and retain all known dependencies.
4. **Model explicit persistent data:** `publisher_posts`, `publisher_jobs`, `publisher_audit`, plus migration metadata and schema version. Validate expected fields and timestamps; never persist access tokens or session cookies inside posts/jobs.
5. **Atomic job claiming:** conditional update only when `status=SCHEDULED`, `scheduledFor <= now` and no active lease. Include claim ID, expiry, attempt count, terminal result and stable idempotency key. Index due-job selection and claim uniqueness. Require a single safe transition after server crash/retry.
6. **Acknowledge delivery uncertainty:** an external publish can succeed before the service records success. Provider APIs do not automatically guarantee exactly-once delivery. Prefer reconciliation and a manual `REVIEW_REQUIRED` state to blind retries when evidence is ambiguous; never promise exactly-once without provider support.
7. **Fail closed on DB errors:** no fallback to ephemeral JSON, auto-publishing queued items, or initializing empty production state after a failed database read. A readiness check should distinguish infrastructure availability, scheduler credential presence and verified persistence.
8. **Backup without buying services:** review encrypted authorized exports and offline restore tests, retention and capacity. A user computer that may be switched off is not a guaranteed automated backup endpoint. Backup status remains **UNVERIFIED** until exercised.

## Staged validation gates

- **Gate 0:** verify pending-job inventory, live-data export and independent restore. Explicitly authorize the handling of sensitive post content.
- **Gate 1:** in an isolated test process, verify read/write/update/restart using synthetic records only. Assert malformed state rejects, no secret leakage, no automatic publication.
- **Gate 2:** confirm restricted network reachability, TLS, dedicated least-privilege database account and database quotas. Do not print connection URIs.
- **Gate 3:** test two simultaneous claims, interrupted delivery, retry/backoff and ambiguous external acknowledgments; no duplicate publish.
- **Gate 4:** test cutover on copied state in a disconnected environment. Only after a fresh owner approval may production configuration or storage backends be changed.
- **Gate 5:** production controlled cutover, verify one approved run, persistence across planned restart **only after** backup safety is proven and rollout is authorized.
- **Gate 6:** check monthly data transfer and storage against included quotas. The low-cost design is not an unlimited free-service guarantee.

## Decisions deliberately deferred

- Which existing Atlas project may hold Publisher data, if any.
- Current inventory of pending jobs and post content; current recovery point.
- Source and destination connection allowlists, roles and backup strategy.
- Exact driver/version and migration protocol; do not write untested database integration into live Publisher.
- Any changes to Render environment variables, GitHub Secrets, DNS, services, deployments, scheduled publishing, or paid features.

## Rollback safety

Do not treat redeploy as a data restore. Preserve the pre-cutover export, schema/version, verified checksum and release commit; stop publication on an ambiguous state. Plan a reversible application configuration switch, but do not silently merge different job queues or republish previous jobs. Test rollback against synthetic records before touching live accounts.

**Current status: PLANNED, NOT MIGRATED.** No production database, credentials or network policies have been changed.

# Publisher scheduler HTTP 401 — controlled recovery

**Prepared:** 2026-10-31 (Asia/Riyadh). **Status:** investigation complete; production recovery **NOT EXECUTED**.  
**Owner roles:** Backend/SRE (diagnosis), Security (credential handling), Data/QA (state preservation and verification).  
**Change classification:** high-risk authentication + automated external publishing + ephemeral storage.

## Confirmed evidence and scope

- GitHub Actions `Digital Insight Publisher Ops` run [41218141767](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41218141767) returned `401` for `POST /api/run-due` on **2026-10-31 16:08 UTC**. Earlier runs [41195966997](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41195966997) and [41173409040](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41173409040) showed the same failure.
- The health response returned `ok:true`, `authConfigured:true`, and `persistence:"ephemeral-file"`. `authConfigured` checks **admin** password/session-secret presence, *not* scheduler credential parity.
- The current Render publisher deployment reports `live` at commit `e919414880fd6c431f8754828f359bf87418a8e4` on branch `digital-insight-publisher`. Its `publisher/server.mjs` returns **503** when its scheduler credential is shorter than 32 characters, and **401** when the supplied Bearer credential does not match. The workflow validates a 32+-character URL-safe `DIA_SCHEDULER_TOKEN` before sending the request. The observed 401 is therefore **consistent with a mismatch of configured credentials**; a header change by an intermediary is a less likely alternative. Secret values were **not** inspected.
- `/api/run-due` executes **every due** job in state `SCHEDULED`. Re-enabling authenticated scheduler requests can produce external posts immediately. Existing pending jobs have **not** been inventoried.
- The server stores posts, jobs and audit records in `publisher/data/store.json` on the service's local filesystem. Render Free web services lose local changes on restart/redeploy/spin-down ([Render docs](https://render.com/docs/free)). Persistence and recovery of historical content are **NOT VERIFIED**. An availability monitor succeeding does not prove scheduling works.

## Hard stop conditions (NO-GO)

Do not rotate/synchronize the credential, trigger `/api/run-due`, redeploy, restart, or run any authenticated publishing action while **any** of these remain unresolved:

1. Unknown queued/due jobs or unsaved posts that could publish unexpectedly.
2. No approved inventory/export of accessible live state (or an explicit owner decision accepting that state may already be lost).
3. No controlled release window, rollback owner and decision on how to prevent duplicate posts.
4. No ability to verify both configuration locations securely without displaying token values.
5. Unknown effects on Telegram/Discord or other external channels.

Do **not** paste credentials, cookies, JSON containing post content or private user data into public GitHub issues, Actions output or PR comments.

## Authorized investigation checklist (read-only first)

1. Open the Render service `digital-insight-publisher` and confirm the current deploy, branch, health, and whether the expected environment-variable **name** exists. Never disclose its value.
2. In GitHub repository Settings → Secrets and variables → Actions, check presence and scope of `DIA_SCHEDULER_TOKEN` (repository versus environment). The current workflow accesses `secrets.DIA_SCHEDULER_TOKEN` without declaring a job environment. Do not infer values from metadata or attempt to retrieve them.
3. Via an **already authorized admin session**, inspect `GET /api/state` for counts/status of posts/jobs, due dates, and incomplete publish attempts. Treat the response as private. Do not request an anonymous bypass or publish the response.
4. If possible through an authorized channel, export an appropriately protected snapshot of posts/jobs/audit data and verify it can be read and restored in an isolated environment. If no recoverable state exists, record that explicitly; do not imply a backup exists.
5. Correlate the public workflow run ID, sanitized HTTP status, Render deploy ID and application logs. Avoid full headers and request bodies.

## Controlled remediation — requires a separate approval

**Phase A — Preserve and gate:** secure an authorized snapshot and review outstanding jobs and destination accounts. Approve exactly which outstanding jobs may eventually execute, if any. If the service is empty due to ephemeral storage, disclose the loss and investigate recovery before acting.

**Phase B — Credential reconciliation:** authorize one high-entropy URL-safe scheduler credential (32+ characters), provision exactly the **same** value to GitHub Actions and the Render service using their secured configuration interfaces, and keep it out of Git/CLI output. This may restart/redeploy Render; record the data-loss impact beforehand. Do not reuse admin credentials.

**Phase C — Safe verification:** verify missing/incorrect tokens return 503/401 in a disposable isolated test server; verify a matching token returns 200 with **zero synthetic due jobs**. A production probe of `/api/run-due` is **not** a safe dry run because it can publish; use a separately designed non-mutating readiness check or a controlled, approved production exercise after the backlog is reviewed.

**Phase D — Resume carefully:** resume only after owner-reviewed backlog, monitoring and repeat-post protection. Verify one authorized scheduler run, destination acknowledgments, job state persistence and audit record, then watch subsequent normal runs.

**Phase E — Durability:** replace local JSON state with an approved durable store **before relying on production scheduling**. Evaluate existing connected storage and costs/quotas; do not provision paid infrastructure automatically. Design backup/restore, idempotency keys, concurrency control and a migration/rollback test.

## Recovery / rollback

- If verification fails, **stop**, do not repeatedly fire authenticated `run-due`, and preserve logs/state.
- Credential rollback is not simply reverting a Git commit: keep the old and new credential locations consistent and control the next schedule. Rotation or rollback requires the same approved change process.
- Do not rely on Render redeploy as state rollback: ephemeral files may already be gone.
- No DNS, GitHub Pages, Railway volumes or canonical site ownership change is part of this recovery.

## Acceptance evidence and status

| Gate | Acceptance | Current |
|---|---|---|
| Root-cause hypothesis | Code and CI explain 401 without exposing secrets | **SUPPORTED** (parity still unverified) |
| Preserve state | Authorized inventory + verified export/restore or explicit loss decision | **BLOCKED** |
| Stop unexpected publication | Every pending job reviewed and replay strategy approved | **BLOCKED** |
| Credential parity | Secure identical values on both sides, never logged | **NOT DONE** |
| Functional success | Controlled approved scheduler returns 2xx and appropriate job outcome | **NOT DONE** |
| Data durability | State survives a restart/redeploy with a verified recovery mechanism | **NOT DONE** |

## Primary references

- [Publisher Ops workflow](https://github.com/imim2009im-a11y/digital-insight-ai/blob/main/.github/workflows/digital-insight-publisher-ops.yml)
- [Published Render server source](https://github.com/imim2009im-a11y/digital-insight-ai/blob/e919414880fd6c431f8754828f359bf87418a8e4/publisher/server.mjs)
- [Incident #101](https://github.com/imim2009im-a11y/digital-insight-ai/issues/101), [engineering board #107](https://github.com/imim2009im-a11y/digital-insight-ai/issues/107)
- [Render Free limitations](https://render.com/docs/free), [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

**Preparation is not restoration.** This runbook contains no production mutations or user secrets.

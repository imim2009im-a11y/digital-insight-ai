# Digital Insight AI — Security testing evidence (2026-11-03)

**Status: PARTIAL, not a penetration-test certification.** Reviewed code, existing CI, production incident logs, GitHub branch configuration and a Docker-contained copy of the static site. The stateful publisher and production website are **out of active scan scope**. No new account or paid service, no customer data access and no credentials were used.

**Work branch:** security/nightvision-readiness-20261103 (draft PR #116). **Production main:** unchanged at 8d13f88cfe24ac643db755e54c41b66b867520f8 when inspected.

## Method and scope

Reference standard: OWASP Web Security Testing Guide (WSTG), https://owasp.org/www-project-web-security-testing-guide/.

| WSTG area | What was checked | Evidence/status |
| --- | --- | --- |
| Reconnaissance / attack surface | Main public site directory, CI files and branch inventory | PARTIAL static only |
| Configuration / deployment | GitHub branch protection, GitHub Pages header handling, ephemeral Publisher storage | FINDINGS recorded below |
| Identity / authentication | Publisher error logs and API source behavior | ISSUE OPEN; no authorized live credential tests |
| Authorization | Sample Supabase RLS policy; publisher release gates in draft PR #110 | STATIC REVIEW ONLY |
| Session management | Publisher draft security changes and production branch architecture | NOT TESTED LIVE |
| Input / client-side | Offline HTML checker and synthetic regressions; source code of site/ | CI PASS for source checks |
| Dynamic security (DAST) | ZAP full scanner against isolated Docker copy of site/ | COMPLETED — run 41712618622; six warning rules, manually review |
| Error handling / data resilience | Publisher loadState() fallback and JSON-file persistence | STATIC FINDING |
| Cryptography / headers | Existing repo headers documentation and issue #56 | LIVE CURRENT STATE UNVERIFIED |
| Business logic | Scheduler workflow code and HTTP 401 evidence | INCIDENT CONFIRMED; no live replay |
| API / third party | Actual Render Publisher, Formspree and provider deliveries | EXCLUDED: unsafe without state/data approval |
| Dependencies / supply chain | Existing pinned CI actions and mongodb-api package manifest | PARTIAL; no full CVE audit |

## Security and reliability findings — source-backed, not exploit demonstrations

### F-01 P0: Scheduled publisher authentication is failing
- Evidence: [GitHub run 41683637207](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41683637207), dated 2026-11-03 at 17:22 UTC, recorded Scheduler HTTP 401. The service health test passed but does **not** verify scheduled-job authorization or delivery.
- Impact: scheduled content workflow unavailable; a blind token correction could trigger queued publications.
- Action: keep [incident #101](https://github.com/imim2009im-a11y/digital-insight-ai/issues/101) open; preserve/inventory publisher state, verify restore and release contract and only then authorize a controlled change. Do not run live /api/run-due as a diagnostic.

### F-02 P1: Live Publisher source can silently reset unreadable JSON state
- Evidence: publisher/server.mjs on branch digital-insight-publisher at e919414880fd6c431f8754828f359bf87418a8e4 has loadState() fallback to defaultState on missing or invalid file. The service advertises persistence: ephemeral-file.
- Impact: losing recoverable business state or duplicating publications after restart/error. No actual production data-loss event has been confirmed by this review.
- Action: isolated restore rehearsal plus fail-closed state loading and durable storage. [Draft PR #110](https://github.com/imim2009im-a11y/digital-insight-ai/pull/110) proposes safeguards but is unmerged. Do not deploy without real snapshot and approval.

### F-03 P1: Publisher deployment branch has no branch protection
- Evidence: GitHub branch metadata on 2026-11-03 reported main.protected=true and digital-insight-publisher.protected=false. The latter branch was previously reported to auto-deploy through Render; current Render deployment ownership must be reconfirmed.
- Impact: missing repository-level gate against direct code changes where authorized write permission exists; not proof of outsider access.
- Action: review required checks, bypass roles, branch rules and the deploy connection before introducing an appropriately scoped protection policy.

### F-04 P1: Security header policy file not enforced on GitHub Pages
- Evidence: [issue #56](https://github.com/imim2009im-a11y/digital-insight-ai/issues/56) documents a prior live observation of absent headers. site/DEPLOY.md correctly states Pages does not apply site/_headers.
- Impact: expected browser controls are not guaranteed by the repository's _headers file.
- Action: choose a verified platform-level header mechanism if required; do not declare production headers fixed without inspecting a fresh real response. **Current live header status was not tested here.**

### F-05 P2 (conditional): Anonymously writable Supabase prototype state
- Evidence: supabase/baiti-schema.sql in the public repo creates demo RLS policies allowing role anon SELECT, INSERT and UPDATE for a shared public-demo state.
- Impact: if applied to an actual service used by multiple people, shared prototype content may be modified by unauthenticated clients.
- Action: treat only as an explicitly disposable public demo; require per-user authorization / proper access control before real user deployment. **Actual deployment of this example schema is unverified.**

## Completed isolated ZAP test: 2026-11-03

- **Evidence:** [GitHub Actions run 41712618622](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41712618622) completed SUCCESS; all steps including network creation, the bounded full scan, sanitized report parsing, and teardown completed.
- **Scope:** disposable Python HTTP server mounting public static site/ read-only, accessible only via a Docker --internal network. The dynamic scanner could not reach the actual web domain, external providers or Publisher.
- **Tool:** official ZAP container. Its pulled image digest was sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af; a later review commit pins that exact digest.
- **Raw ZAP console:** 0 FAIL-NEW, **6 distinct WARN-NEW rule categories** and 108 PASS policy checks; do not interpret these numbers as tested pages, confirmed production weaknesses, or comprehensive penetration-test coverage.
- **Sanitized ZAP JSON:** High 0, Medium 4, Low 2, Info 3 distinct alert records. No sensitive request or response payloads were uploaded.

| Warning category (ZAP rule) | Interpreting this isolated test |
| --- | --- |
| Missing Anti-clickjacking Header (10020) | The Python test server does not mimic deployed response headers. Issue #56 independently documents a previous production header problem, but this scan does not reconfirm it. |
| X-Content-Type-Options Header Missing (10021) | Local test-server response; live header status needs independent verification. |
| Server Leaks Version Information (10036) | Python test-server header, not evidence of a Publisher or Pages server disclosure. |
| Content Security Policy Header Not Set (10038) | Test-server observation; site/_headers does not automatically enforce CSP on GitHub Pages. |
| HTTP to HTTPS Insecure Transition in Form Post (10041) | The isolated replica uses HTTP while the real form endpoint is HTTPS. This is an environment artifact, not proof of a production mixed-content flaw. |
| Absence of Anti-CSRF Tokens (10202) | Observed public third-party contact form in local test; it does not prove a vulnerable authenticated state-change endpoint. |

**Interpretation:** The full-scan automation executed and identified review items, but **no successful exploitation of production was demonstrated**. In particular, the protected GitHub Pages site, real TLS/headers, external form backend and any authenticated Publisher route were not tested. Absence of high-risk alerts here is not evidence that production is secure.

### F-06 P1 conditional: non-atomic MongoDB migration may destroy target records

- Evidence: mongodb-api/server.js lines 59–90. If MIGRATE_ON_START is explicitly enabled, it enumerates target collections, calls deleteMany({}) per collection, and then attempts insertMany() from the source. This can leave partially migrated data after an error.
- The runtime flag, target database and actual migration status were **not** verified; this is an operational design risk, not a confirmed incident or externally exploitable vulnerability.
- Action: keep migration disabled until target snapshot/restore, isolated reconciliation, per-collection integrity checks and rollback are verified. Never trigger this workflow as a routine security test.

### F-07 P2: reproducible dependency inventory incomplete

- The main repository's mongodb-api/package.json pins mongodb 7.6.0, but the recursive tree listing contains no mongodb-api/package-lock.json. Its transitive dependency resolution and audit of known vulnerabilities remain outside this engagement.
- Action: review/update lockfile and dependency advisories in a dedicated nonproduction PR. No CVE has been independently verified by this observation.

## Automated source evidence

- Offline HTML audit under scripts/site_security_lint.py reads site/**/*.html; no network or third-party credentials.
- Source-only governance and quality checks passed on the review branch prior to adding isolated DAST. Detailed latest run IDs should be taken from PR #116 checks.
- ZAP Docker testing, when completed, reports only local site-host alerts. The Python test server is **not a faithful security-header replica of GitHub Pages**, and remote forms/affiliates are not reachable from the internal Docker network. A ZAP finding does not prove a flaw in production.

## Limitations / mandatory next gates

1. Production HTTP header checks, infrastructure TLS, account-authenticated/API testing, and genuine external provider interactions were intentionally not executed.
2. Do not interpret CI green as vulnerability-free.
3. A full, live production penetration test requires isolated data, recoverable state, scope authorization and an explicit high-impact change window, especially for Publisher.
4. Keep vendor NightVision deferred: owner does not have an account and disallows spending.
5. Coordinate PR #116 and #109 modifications to scripts/agent-verify.sh before any merge. Independent review is still required.

## Primary sources

- [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/)
- [ZAP full scan documentation](https://www.zaproxy.org/docs/docker/full-scan/)
- [ZAP Docker image security](https://www.zaproxy.org/docs/docker/about/)
- [GitHub Actions public repository billing](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [Render free instance limitations](https://render.com/docs/free)

**No claim of penetration-test completeness, exploitability, or production safety is made in this report.**

# GitHub DevSecOps baseline — 2026-10-31

Scope: a reviewable file-configuration change for this public repository. It does not change account settings, production branches, credentials, billing or deployment ownership.

## Observed baseline

At main commit `8d13f88cfe24ac643db755e54c41b66b867520f8`, all external actions in the 12 main workflows already used full commit SHAs. The five distinct direct action commits were looked up in their official `actions/*` repositories and GitHub reported verified signatures. This is provenance evidence, not a vulnerability-free claim.

`static-rebuild-check.yml` inherited token permissions and persisted checkout credentials; three jobs lacked explicit time limits. The governance workflow inserted a base ref directly into shell source. No active Dependabot configuration existed on main. PR #10 contains an older Actions-only proposal; this configuration supersedes that hunk only, and its remaining work still needs separate review.

The publisher branch has a different runtime and an existing security PR #110. It is outside this patch. Render was observed auto-deploying from main and the publisher branch. Historical architecture documents are not current infrastructure evidence; deployment ownership was not changed or declared resolved.

## Proposed controls

- Restrict static rebuild to `contents: read`, disable persisted checkout credentials and cap its job at 8 minutes.
- Use an environment variable for the quoted base ref in the governance shell command.
- Cap professional QA at 8 minutes and Pages deployment at 15 minutes, allowing setup time around the deployment action's existing 10-minute internal timeout.
- Use Dependabot monthly for GitHub Actions and the active `/mongodb-api` npm project, with at most two open version-update PRs per ecosystem. The frozen `ai-tools-directory/` snapshot is excluded. Renovate is not added.

Triggers, concurrency, pinned action versions, secret references and runtime behavior are preserved. Dependabot file configuration does not prove that alerts, security updates or dependency graph settings are enabled. Dependabot starts only after an accepted default-branch configuration; review update PRs individually.

## Verification and release boundary

The complete 277-file main snapshot was obtained through the authorized GitHub connection. Each file's Git blob digest and the complete local tree `86e34da7c97c3245a0b13407fcad2257bdd2ae23` matched upstream before editing.

Local checks passed: consolidated source verification (14 preflight tests, stored-XSS check, 15-page site validation and agent TOML validation), professional site validation (23 canonical URLs), four interaction tests, two static-input security tests, YAML parsing, unchanged trigger/action-ref comparisons and shell syntax checks. The stored-XSS harness emits its existing handled `localStorage` diagnostic before passing. Browser end-to-end tests and live HTTP/TLS were not run locally; network egress is blocked. Remote CI must be reviewed separately.

actionlint, zizmor, OSV-Scanner and Scorecard were absent from the execution environment. Binary installation and database access were blocked by network policy. Manual/YAML checks are not substitutes for those tools; none is claimed installed or passed.

Merging the Pages workflow edit triggers the existing production deployment. Keep this change unmerged until the deployment impact and CI results are approved. No production deployment was requested as part of preparing the PR.

## Cost and rollback

Maximum Unapproved Spending: **$0**. No paid subscription, model API, new Actions schedule, hosted scanner, Codespace, package or hosting resource is created. The proposed monthly Dependabot schedules become active only after an accepted default-branch configuration. Current official GitHub documentation describes standard public-repository runner compute as free; this does not establish account-wide storage, hosting or other service costs. Existing workflows may use storage or external integrations. Actual account usage, budgets and billing remain NOT ACCESSIBLE through the current connection.

Existing publisher schedules deserve a separate review: the five-minute schedule represents up to 8,640 events per 30 days, and the watchdog adds up to 2,880. These are theoretical trigger counts, not measured minutes or charges. Their production behavior is unchanged here.

Before merge, rollback is closing the proposal without deploying. After an approved merge, use a reviewed revert of the configuration commit. Reverting Dependabot stops future version-update scheduling but does not close existing update PRs or roll back deployed artifacts. A deployed Pages artifact requires its own approved source revert and verification.

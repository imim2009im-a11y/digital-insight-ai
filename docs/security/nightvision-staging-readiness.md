# NightVision DAST staging readiness — evidence-only gate

**Date:** 2026-11-03. **Issue:** #115. **Phase:** metadata review only.
**Production:** NO CHANGE. **NightVision:** NOT INSTALLED, NOT CONFIGURED, NOT EXECUTED.

## Objective and architecture

The canonical Digital Insight AI site uses the repository's `site/` static source. The unrelated stateful Publisher has an active scheduler HTTP 401 incident (#101), an unprotected deployment branch and unverified recoverability. It must **not** be an automated DAST target. Static unit tests, CodeQL or GitHub Actions success cannot substitute for DAST findings.

This preparation adds a stdlib-only offline validator, a deliberately blocked configuration, and synthetic tests. It **never connects** to NightVision, resolves DNS, executes a URL, creates a target, reads tokens, or invokes a scan. There are **no new scheduled workflows, third-party actions, host resources or account connections**.

## Files and operation

- `.github/nightvision-staging-readiness.json`: deliberately blocked until operator evidence exists. **Do not put secrets, host auth, personal data, scan reports or private links in it.**
- `scripts/nightvision_readiness.py`: schema, known-production exclusion, exact hostname and scoped-path checks; outputs gate statuses only, without input values. Its `CONFIG_REVIEW_READY` means **self-attested metadata** only, not a verified authorization or a safe scan.
- `scripts/test_nightvision_readiness.py`: synthetic positive and failure-mode regression suite. Included in the existing `scripts/agent-verify.sh` and its normal CI, with no NightVision API usage.

Inspect the default (returns `BLOCKED` but exits 0 for CI):

```bash
python3 scripts/nightvision_readiness.py
```

Optional strict local operator check (returns 1 while blocked):

```bash
python3 scripts/nightvision_readiness.py --strict
```

The validator's excluded path strings are **advisory declarations**, not enforceable NightVision scanner scope. The exact target configuration, authentication, API methods and any scope rules must separately be reviewed and applied inside NightVision before an approved scan. No generic scanner/CI script may read the file and infer scan authorization.

## Human verification gates (not yet fulfilled)

1. Confirm legal ownership and explicit permission to scan a **disposable nonproduction** environment; identify the exact HTTPS hostname and target kind (WEB/API). Verify physical/logical isolation from production data, external accounts, publishing/checkout/messaging and privileged services.
2. Approve a narrow path/method allowlist, exclusion rules, traffic budget, scan window, and emergency stop. Deny all mutating, webhook and outbound side-effect routes by default. An API scanner may perform active requests even when its report is read-only.
3. Verify only synthetic data and disposable accounts are present; review credential-handling and cookie-auth recording locally if needed. Never use a production scheduler or administrator token.
4. Confirm NightVision plan, trial/credits, usage quota and billable features from the current vendor account. Maximum unapproved spend: **$0**; if any cost uncertainty remains, stay blocked.
5. Demonstrate test-state backup/restoration and rollback for the approved nonproduction target. Confirm operators can stop running scans without touching production services.
6. Separately approve any manual execution, installation, export or SARIF upload. GitHub code scanning entitlements and SARIF upload permissions must be validated; a passing DAST command exit code does not imply zero vulnerabilities.

## Why no automated scanner workflow?

- GitHub documents that workflows should run with a least-privilege `GITHUB_TOKEN` and must treat PR inputs as untrusted.
- NightVision's own skill/tooling describes DAST as active testing using configured projects and targets, not a read-only repository scan.
- GitHub environments and protected manual approvals can enforce human review if a later dedicated scan workflow is authorized; environment restrictions and costs must be confirmed first.
- Render documents that filesystem modifications on free web services are ephemeral, which makes active scans of the stateful Publisher inappropriate before state recovery.

## Release decision

**NO-GO** until the independent owner, isolated target, source-of-truth scope, cost/entitlement, synthetic data and rollback evidence are collected. Passing this static metadata gate is not approval to send traffic.

Source references:
- NightVision official agent skills: https://github.com/nvsecurity/nightvision-skills
- GitHub Actions least privilege: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub secure use: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub protected environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Render free service limitations: https://render.com/docs/free

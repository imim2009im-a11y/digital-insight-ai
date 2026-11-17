# Zero-cost / no-account security baseline for Digital Insight AI

**Status:** source-only Draft PR #116. **Cost requirement:** no paid service, new account, token, hosted scanner, domain change, production deployment, or API key.

## Decision

The owner has **no NightVision account** and does not want a paid service. NightVision DAST is therefore **deferred, not installed or invoked**. The existing NightVision metadata readiness file remains explicitly BLOCKED and optional; its presence does not require account creation.

The selected immediately executable alternative is a **Python standard-library offline static HTML audit**, tested in the repository's already configured GitHub Actions checks. It reads the committed \`site/\` tree and never sends HTTP traffic to a website, submits forms, runs dynamic scripts, or accesses service secrets.

## Controls implemented

- \`scripts/site_security_lint.py\`: detects inline HTML event handlers, \`javascript:\` URL attributes, unencrypted active resources (scripts, frames, images, stylesheet), and unexpected external POST form destinations. Only the existing HTTPS \`formspree.io\` form target is allowed as an external POST destination. The audit enumerates nested HTML pages without reading files beyond \`site/\`.
- \`scripts/test_site_security_lint.py\`: synthetic positive and negative fixtures, including bad external form actions, active HTTP resources and unwanted inline events.
- \`scripts/agent-verify.sh\`: runs the tests and the checker on real \`site/\` content, from the already existing bounded source preflight. No new Actions workflow/schedule is necessary.
- The prior \`scripts/nightvision_synthetic_target.py\` and its tests provide a loopback-only, disposable synthetic fixture; it is not a deployed or scanned service.

Run offline:

\`\`\`bash
python3 -m unittest discover -s scripts -p test_site_security_lint.py
python3 scripts/site_security_lint.py
\`\`\`

## What this does NOT prove

A green static audit is **not** a dynamic application security test, vulnerability-free certification, actual HTTP response-header verification, authentication assessment, secrets scan across all historical commits, package audit, or proof of production safety. In particular, \`site/_headers\` is **not applied by GitHub Pages**; its existence does not prove deployed CSP/HSTS/X-Frame-Options.

Open production Publisher incident #101 is a separate problem: scheduler returns 401, published jobs and storage recoverability remain unverified. Do not repair it by blindly rotating credentials or executing queued publication.

OWASP ZAP is a genuine open-source accountless alternative for *future, separately authorized* dynamic scanning. Its Baseline Scan performs passive analysis but still spiders the supplied target and sends live HTTP requests. Do not run it against Digital Insight AI production or the Publisher while the authorization, queue and recovery constraints remain unresolved.

## Costs, review and rollback

- This project repository is public; GitHub documents that **standard hosted runners** for public repositories are free. Larger runners, some storage/other services can be billed, so the PR uses the existing \`ubuntu-latest\` CI configuration and creates no new hosted resources.
- The only current changes are review-branch source files. Rollback before merge: close the draft PR. After an explicitly approved merge, revert its commit(s) via a reviewed change.
- Review for parser false positives, path traversal/symlink handling, high-value missing checks and duplicated \`scripts/agent-verify.sh\` changes from PR #109. Do not merge while required CI fails.

## Primary references

- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
- OWASP ZAP open-source background: https://www.zaproxy.org/getting-started/
- OWASP ZAP baseline behavior: https://www.zaproxy.org/docs/docker/baseline-scan/
- GitHub Pages header compatibility: \`site/DEPLOY.md\`
- MDN new-tab links and \`noopener\`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener

**Release gate:** Keep PR draft pending independent review, cross-PR CI integration review, and latest CI. No active scan or payment required for the offline checks.

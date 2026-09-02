## Outcome

Describe the observable result this PR is intended to produce.

## Scope

- [ ] Change is focused on the requested outcome.
- [ ] No unrelated production migration or platform change is included.

## Risk

Risk level: Low / Medium / High

Production impact:

Rollback/recovery path (required for high-risk changes):

## Verification evidence

List checks that were actually run. Do not mark unrun checks as passing.

- [ ] `bash scripts/agent-verify.sh`
- [ ] Relevant targeted tests/checks
- [ ] Live production smoke check when applicable
- [ ] Mobile/RTL/accessibility review when public UI changed
- [ ] SEO/canonical/sitemap review when public routes or metadata changed
- [ ] Security/secrets review when integrations, deployment, auth, or data handling changed

Evidence/results:

## Independent review

Findings from a fresh review of the finished change:

- Outcome compliance:
- Regression risk:
- Security/privacy:
- Accessibility/SEO when applicable:

## Architecture

- [ ] `AGENTS.md` was followed.
- [ ] `PRODUCTION-ARCHITECTURE.md` remains accurate, or it was updated in this PR.
- [ ] No competing canonical production origin was introduced.
- [ ] No secret, token, password, private key, `.env`, or credential was committed.

## Remaining limitations

State anything not verified, intentionally deferred, or still risky.

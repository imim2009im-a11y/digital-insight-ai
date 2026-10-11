# ADR-2026-10-11 — Manjaro engineering workstation + GitHub-hosted verification

**Decision:** Accepted by project owner on 2026-10-11.
**Implementation state:** Operating-model documentation only; changes are proposed through a pull request.
**Production boundary:** No deployment, DNS, credentials, billing, or local system configuration changes in this ADR.

## 1. Scope and authority

This decision extends — and does not replace — `AGENTS.md`, `AGENT-OPERATING-SYSTEM.md`, `PRODUCTION-ARCHITECTURE.md`, and `docs/IA-PREFLIGHT.md`. In case of conflict, `AGENTS.md` and verified live production state control; do not assume historical DNS notes remain current.

The source of truth is `imim2009im-a11y/digital-insight-ai`, with the public static website under `site/`. `main` remains the protected production branch. Other existing repositories retain their ownership and should not be copied into this one.

## 2. Roles and trust boundaries

| Component | Responsibility | Allowed by this decision | Explicitly *not* established |
|---|---|---|---|
| ChatGPT and authorized connectors | Plan, inspect, coordinate, review, report evidence | Scoped requests to GitHub and the connected Manjaro device | A continuously running agent, permanent workstation control, or automatically shared credentials |
| Manjaro `ib488-imac142` | Local engineering, manual tests, diagnostics and isolated previews | Authorized, task-scoped engineering work via a verified connected device | GitHub self-hosted Actions runner, internet-exposed control endpoint or 24/7 production node |
| GitHub source and Pull Requests | Durable reviewed code and change history | Non-destructive edits on feature branches, CI evidence, protected-branch merge rules | Permission to bypass reviews/checks or change DNS, secrets, billing or production ownership |
| GitHub-hosted Actions | CI jobs, source verification and existing monitoring workflows | Existing `ubuntu-latest` jobs; checks at the exact PR head | Durable local SQLite across separate ephemeral jobs or permanent agent memory |
| ChatGPT Work / separate cloud computer | Optional cloud execution surface | Use only after session, filesystem, identity, authorization and limitations are individually verified | Guaranteed Codex Cloud integration, persistence, scheduled execution or unrestricted OS access |

**Critical security decision:** Do not install or register this public repository with a persistent, self-hosted GitHub Actions runner on Manjaro. GitHub and OWASP both identify elevated risk from running untrusted public pull-request code on persistent self-hosted machines.

## 3. Standard execution contract

1. **Discover:** Read `AGENTS.md`, the relevant repository source, recent equivalent completed work, open PRs, local `git status`, and existing workflows. Identify exactly one measurable target and its owner.
2. **Authorize:** Confirm which device/connection is online. Do not infer sudo/root permissions from a connected agent. Do not expand OAuth/plugin access or import files without approval.
3. **Isolate:** Preserve all existing local uncommitted work. Prefer a disposable checkout or a dedicated `codex/*` branch; never overwrite the user's current working tree.
4. **Implement:** Make one focused, reversible change; avoid network-exposed local control, secrets, and new paid services. Keep ownership of `site/` and its canonical origin unchanged.
5. **Verify locally:** Run targeted tests. Where applicable use `bash scripts/agent-verify.sh` and `python3 -m unittest discover -s scripts -p test_ia_preflight.py`. Treat a missing test or tool as blocked, not passed.
6. **Verify remotely:** Open/update a PR, inspect CI on its **current** head SHA, and require the existing `verify` and `ia-agent-governance` checks per current branch-protection configuration. Check workflow requirements again before every merge.
7. **Review:** Inspect the diff for secrets, permission expansion, regressions, destructive changes, production coupling, and cost. A passing check alone is not a human approval.
8. **Release and monitor:** Only merge after the applicable review gates and authorized release decision. Check actual production endpoints **after** an applicable deployment; do not equate a successful build with a successful deployment.
9. **Report:** Include executed commands, branch/commit/PR, test counts, exact CI run links, current device status, risks, and rollback. Explicitly label execution versus verification.

## 4. Constraints and anti-duplication

- Do not create a second site origin, duplicate CI pipeline, additional scheduler, cloud gateway or monitoring service merely to enact this ADR.
- Existing `scripts/ia_preflight.py` provides bounded source verification and checkout-local SQLite state. Its `--resume` behavior does **not** prove cross-session durability.
- Existing GitHub Actions monitoring and ChatGPT scheduled tasks are separate mechanisms. Verify their actual run IDs and notification channels before describing them as functioning alerts. Prefer extending an existing task rather than creating a duplicate.
- Preserve role distinction: the IA Manjaro Engineer connector reports a `cloud-read-only` mutation policy for its MCP surface. Remote Desktop Commander access, when online and authorized, is a separate capability, not a blanket privilege grant.
- Do not place credentials, browser cookies, SSH keys, personal files, client data, payment information or local home-folder snapshots into GitHub Actions or ChatGPT Work automatically.
- Use GitHub-hosted runners for untrusted PR validation. Never expose an administrator shell or a local web-management port to the internet solely for agent access.
- Hosted runner execution and usage are subject to GitHub account policies, quota, service availability, and existing workflow behavior. Do not claim guaranteed zero cost in every configuration.

## 5. Acceptance tests

- [ ] Confirm the Manjaro device is online and authorized at execution time; safely inspect `git status` in the intended repository.
- [ ] Verify the GitHub branch protection remains enabled and required check names are distinct: `verify`, `ia-agent-governance`.
- [ ] Confirm all relevant PR checks pass on the current head and that the PR is up to date with its base where required.
- [ ] Test in an isolated checkout and preserve any user's preexisting modifications.
- [ ] Confirm the public canonical site, `robots.txt`, `sitemap.xml` and legacy redirects respond as expected after production-impacting releases.
- [ ] Confirm no persistent self-hosted runner, new paid resource, DNS change, API key, new scheduling task or local privilege escalation was introduced by this adoption.
- [ ] Log blockers rather than inventing completion.

## 6. Rollback and limitations

This ADR is documentation-only. **Before merge**, close the PR without affecting production. **After merge**, revert the ADR commit(s) through a protected-branch PR; do not reset or force-push `main`. The prior local projects and user files must remain intact.

This decision **does not** provision a new cloud computer or autonomous service, test every plugin, establish durable agent storage, or guarantee delivery of alerts. Those require separate scoped tasks with evidence and explicit authorization.

## References

- GitHub — [Secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use).
- GitHub — [Workflow syntax / GitHub-hosted runners](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
- GitHub — [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- GitHub — [Required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
- OWASP — [GitHub Actions Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GitHub_Actions_Security_Cheat_Sheet.html).

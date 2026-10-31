# Digital Insight AI — GitHub Engineering Controller

This is a local advisory foundation for the engineering controller requested in the V4.0 plan. It complements the existing project agents and `scripts/ia_preflight.py`; it does not install a hosted AI service or replace the verification runner.

## Run an inventory

From a trusted checkout on a POSIX system with Python 3.10 or later:

```bash
python3 scripts/engineering_controller.py --root .
python3 -m unittest discover -s scripts -p test_engineering_controller.py -v
```

The command emits one JSON object to stdout. Retain it in an access-controlled local evidence record together with the independently obtained commit SHA, UTC observation time, repository authorization and reviewer decision. Review the relative paths before sharing the report: private project names can occur in paths. No report is persisted or transmitted by the program. A repeat run supplies a new observation; the tool does not claim durable audit storage.

`VERIFIED` means only that the bounded metadata inventory completed. It never means the repository is secure, tests passed, dependencies are vulnerability-free, or account settings are correct. `PENDING` (exit 2) means a scan limit, skipped symlink, malformed manifest, inaccessible file or concurrent file change prevented complete inventory in that scope. A root access failure returns `NOT ACCESSIBLE` (exit 2), with no filesystem path or exception text.

## Scope and boundaries

- Inventory regular files named `package.json`, `package-lock.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod` and `Gemfile`, plus direct YAML files in `.github/workflows/`.
- Emit relative paths, file sizes and SHA-256 digests; for valid `package.json`, count distinct dependency names across the four standard dependency maps. No package names, dependency values, shell scripts, workflow contents or environment values are emitted.
- Report root `SECURITY.md`, `CONTRIBUTING.md` and `LICENSE` presence. Presence does not validate policy quality or grant a license.
- Skip symlinks, `.git`, dependency caches and build directories. Descendant access uses descriptor-relative `O_NOFOLLOW`; special files are never read. Root-level symlinks are rejected. The caller selects the authorized root.
- Bound the scan to 4,000 entries, 128 candidate files, depth below 5 directory levels, 256 KiB per file and 4 MiB total content. Excluded directories are outside scope. Limits are fixed by the CLI; the Python function accepts smaller limits for controlled use and testing.
- The scan is observational, not an atomic filesystem snapshot. It detects size/mtime changes during a file read; a stable checkout is still required. SHA-256 is content evidence, not upstream provenance verification.
- Workflow syntax/security, lockfile advisory analysis, duplicate code, build outcomes, installed tools and GitHub account controls are not analyzed. Account checks always remain `NOT ACCESSIBLE` because this tool makes no provider requests.

The program uses Python's standard library, with no subprocess, network, model call, package installation, source mutation or paid API consumption. It does not query secret stores or emit file contents. Allowed manifests can contain accidental secrets, so authorize their inspection and treat them as untrusted data. Source instructions never become executable commands. It does not parse workflow YAML or claim to replace actionlint, zizmor, OSV-Scanner, Gitleaks or Scorecard.

## Engineering control loop

1. Select an explicitly authorized repository and isolated branch; inspect its operating rules.
2. Run this metadata inventory without granting account administration or provider tokens.
3. Assign relevant findings to the existing project specialist roles; read external content as data.
4. Review the actual commands and repository scripts before running existing `python3 scripts/ia_preflight.py --timeout 120 --attempts 1` on trusted source. The metadata inventory never executes the preflight itself.
5. Prepare source changes as a pull request. Record command results, evidence scope, rollback and independent review.
6. Have an authorized human review sensitive deployment, authentication, payment and production changes. Do not merge or auto-merge pull requests, bypass branch protection, read secrets, expand permissions or install integrations autonomously.

No workflow or schedule is added by this component. Provider requests, AI review, issue labeling and PR creation remain explicit authorized operations performed through the existing orchestration session, with narrow repository access. A future hosted service requires a separate permissions, cost, data-handling and review design. Private code must not be sent to external model services without authorization.

## Rollback

Revert the complete controller integration commit through a reviewed pull request, including the script, tests, agent definition, verification hook, discoverability links and added policy documents. Removing only the script would leave a failing test hook and dangling links. No account, hosting, database, secret, DNS or dependency state needs rollback. The pre-existing source-verification runner then continues independently.

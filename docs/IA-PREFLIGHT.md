# IA cloud source preflight — merged executable increment

This is a POSIX source-verification utility, not an autonomous model agent or
hosted scheduler. The implementation from PR #83 was merged into `main` on
2026-10-11. It extends the design explored in draft PR #82 without making that
unmerged contract a runtime dependency.

## Acceptance and operation

Run from this repository with Python 3.12+, Bash, Node and Git available:

```bash
python3 scripts/ia_preflight.py --timeout 120 --attempts 1
python3 scripts/ia_preflight.py --resume
python3 -m unittest discover -s scripts -p test_ia_preflight.py -v
bash scripts/agent-verify.sh
```

The only executable mission is the existing source verification command.
Live-production smoke and Docker flags are forced off; no model API calls,
provider writes, new dependencies, credentials or paid resources are used.
This is not an OS sandbox: trusted repository scripts still run with the
calling user's rights. Run untrusted branches only in an isolated runner.

- SQLite state lives in the Git metadata directory, outside tracked source.
- An exclusive nonblocking POSIX lock prevents concurrent runs in that checkout.
- Successful runs can be reused only for an identical fingerprint of Git-visible
  source paths, file bytes, modes, Git index entries, symlink targets and runtime
  identities (Git/Node/Bash/Python version outputs and resolved paths). Ignored build/cache files
  do not participate. A check relying on ignored files or changed tool contents
  that retain the same reported version/path
  must be run without `--resume`; cache reuse is an optimization, not new evidence.
- Attempts are limited to 1–3, each to 1–600 seconds. A timeout kills the process
  group. External processes that detach from the group are outside this guarantee.
  Git inventory, streaming source hashing and SQLite operations are outside the
  subprocess timeout. The runner is intended for small trusted checkouts.
- Interrupted records remain `running` and are never treated as success. A later
  invocation marks them `interrupted` and reruns them after the OS releases the lock.
  This marks an ended parent invocation; an externally killed parent may leave
  orphan child processes. A hosted supervisor is required to bound that case.
- Process-start failures are recorded as `error` without persisting exception text.
- Verification atomically writes schema-versioned `evidence.json` beside the database
  before releasing the lock; blocked calls never overwrite the last completed report.
  It contains allowlisted status/ID/duration/fingerprint fields, not subprocess output.
  The existing governance workflow publishes these fields in its run summary.
  Evidence is not imported as trusted execution state.
- Source changes during a check yield `source_changed`, not success.
- Audit records contain status, timestamps, duration, exit code and fingerprint.
  Child stdout/stderr are discarded to prevent accidental secret persistence;
  use the ordinary verifier interactively for diagnostic output.
- SQLite persistence across cloud-session destruction requires a separately
  approved durable runtime/state adapter. This checkout is not a 24/7 service.

## Verified integration record

PR #83 was merged by merge commit
`08d5b50ba9a3cb87d29dead59be814a4f360e612`. Its final branch head was
`f444a287b4d0589bad20999fa4a549b94c23b344`.

On that head, GitHub Actions completed successfully:

- Agent Governance Verification: run `38110950513`.
- Static Site Quality Gate: run `38110950520`.

The PR also records an independent Linux verification of 14/14 preflight unit
tests and an isolated integration rehearsal against the then-current `main`.
Those results are historical evidence for the merged change, not a guarantee
that a later checkout, runtime or production endpoint remains healthy.

## Capability matrix observed 2026-10-11

| Component | Status | Evidence / limitation |
|---|---|---|
| GitHub repository integration | Connected and verified for PR #83 | PR merged; exact head and workflow run IDs recorded above |
| Source verification | Merged and CI-verified | SQLite run history, bounded attempts, runtime-aware resume and atomic allowlisted evidence |
| Observability | Checkout-local evidence plus CI summary | No provider monitoring, alert delivery or durable cross-session state |
| Codex Cloud separate runtime | Not verified by this document | Repository CI and connector access do not prove a separate Codex Cloud runtime |
| MCP Gateway | Not integrated | Scoped authentication and protocol behavior remain unverified; no secrets used |
| Agents SDK / API | Not integrated | No dependency installed and no paid API key used |
| Production deployment | Outside this utility's scope | Merging PR #83 did not deploy the public site or authorize DNS, database or hosting changes |
| Local device administration | Outside scope | No device permission is granted by this repository utility |

## Prior work and plan

PR #82 remains historical design work. PR #83 delivered the first bounded source
preflight increment to `main`; future work must extend that implementation rather
than recreate it.

| Priority | Increment | Value / risk / effort |
|---|---|---|
| 1 | Durable runner adapter and immutable evidence upload | Needed for reliable cross-session resume; requires storage review; medium |
| 2 | Scoped MCP adapter with capability probes | Enables provider execution; authentication approval required; medium |
| 3 | SDK orchestration and budget accounting | Plan/execute/validate separation; keys and spend caps required; large |
| 4 | Reviewed scheduler and alert delivery | Enables periodic operation; end-to-end test and cost evidence required; medium |

Do not duplicate existing schedules. Before proposing activation, verify the
runner, durable storage, timeout/cost policy, lock across runners, alert delivery,
and one real scheduled execution ID. Existing automation metadata alone does not
establish background engineering or continuous service.

## Controlled improvement record

Discover → Evaluate → Sandbox → Benchmark → Review → Integrate → Verify → Monitor.
For each future dependency record exact version, upstream license, official
source, benefit, trust boundary, resource budget, baseline/candidate measurements,
review verdict and rollback. No new dependency was adopted by PR #83.

Official research sources consulted for the original increment:

- https://openai.github.io/openai-agents-python/sessions/ — conversation memory
  and interrupted-run continuation; does not provide a scheduler.
- https://github.com/openai/openai-agents-python/blob/main/docs/tracing.md —
  tracing, flush behavior and fail-closed redaction/export boundaries.
- https://openai.github.io/openai-agents-python/usage/ — per-run usage accounting.

No SDK version or license is claimed as adopted. Pin and inspect both before any
future installation. Conversation memory is separate from this utility's mission
status and must not substitute for durable job orchestration.

## Rollback

Before this documentation update is merged, close its draft PR or delete its
branch. If the update is merged, revert its documentation commit. To roll back
the preflight implementation itself, revert merge commit
`08d5b50ba9a3cb87d29dead59be814a4f360e612` through a separately reviewed PR.
No data/schema migration or dependency uninstall is required. Checkout-local
Git-metadata state may be retained as evidence or archived separately.

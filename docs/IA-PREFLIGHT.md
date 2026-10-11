# IA cloud source preflight — first executable increment

This is a POSIX source-verification utility, not an autonomous model agent or
hosted scheduler. It extends the design in draft PR #82 without copying that
unmerged document or changing production. Start from `main` commit
`817a19b962279440d8bbb906f30eb76c4f278e9f`.

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

## Capability matrix observed 2026-10-07 UTC / 2026-10-08 Riyadh

| Component | Status | Evidence / limitation |
|---|---|---|
| Work cloud filesystem and terminal | Connected and tested | Cloud checkout, Git/Python/Node execution and source checks |
| Cloud Chrome | Available, not interaction-tested | Browser inventory: Chrome CDP, one about:blank tab; native apps absent |
| Network | Partially tested | HTTPS Git clone/fetch succeeds; web GitHub open returned DisabledError; official documentation search succeeds |
| GitHub | Connected and read-tested | Authenticated imim2009im-a11y; repo metadata reports pull/push/admin; PR #82 inspected |
| Codex Cloud separate runtime | Not connected in this mission | No exposed task/environment interface discovered; shell availability is not proof |
| MCP Gateway | Not connected | HTTPS endpoint returned 401; scoped MCP authentication/protocol not tested; no secrets used |
| IA engineering skill | Read and applied | Package 0.4.0; instructions do not prove a running MCP server |
| Skills catalog | Available, partial compatibility | Relevant skills read; no claim all skills/plugins are installed or tested |
| Agents SDK / API | Not integrated | Official documentation researched; no dependency installed or key used |
| Knowledge base | Repository documentation available | Prior contract inspected at immutable PR-head SHA; official sources below |
| Observability | Local increment tested; CI summary integration under review | SQLite run IDs/status/duration and atomic JSON; provider monitoring and alert delivery untested |
| Automation interface | Read-tested, execution unverified | Existing tasks inspected; no new schedule activated; relevant engineering task has no observed last run |
| Production release / merge | Needs explicit approval | No main update, deployment or merge authorized |
| Paid runtime and credentials | Needs explicit approval | Account quota, spend and billing limits unknown; no paid resources created |
| Local device administration | Out of scope | Native apps absent; no device access expanded |

Observed memory: approximately 9.7 GiB total; scratch volume approximately 32 GiB.
These are point-in-time runtime observations, not guaranteed quotas or price limits.

## Prior work and plan

PR #82 is open, draft and unmerged at
`af5d8c271c999d22f8c45af3b05456e964ebcf33`. Its contract file exists only on its
feature branch (default-branch fetch returned 404). Existing production
architecture documents contain old DNS observations; this mission does not
reverify or change production ownership.

| Priority | Increment | Value / risk / effort |
|---|---|---|
| 1 | Fixed source preflight with resume, bounded retries and lock | Immediate repeatable verification; medium script risk; small |
| 2 | Durable runner adapter and immutable evidence upload | Needed for reliable cross-session resume; requires storage review; medium |
| 3 | Scoped MCP adapter with capability probes | Enables provider execution; authentication approval required; medium |
| 4 | SDK orchestration and budget accounting | Plan/execute/validate separation; keys and spend caps required; large |
| 5 | Reviewed scheduler and alert delivery | Enables periodic operation; end-to-end test and cost evidence required; medium |

Do not duplicate existing schedules. Before proposing activation, verify the
runner, durable storage, timeout/cost policy, lock across runners, alert delivery,
and one real scheduled execution ID. Existing automation metadata alone does not
establish background engineering or continuous service.

## Controlled improvement record

Discover → Evaluate → Sandbox → Benchmark → Review → Integrate → Verify → Monitor.
For each future dependency record exact version, upstream license, official
source, benefit, trust boundary, resource budget, baseline/candidate measurements,
review verdict and rollback. No new dependency is adopted by this increment.

Official research sources consulted:
- https://openai.github.io/openai-agents-python/sessions/ — conversation memory
  and interrupted-run continuation; does not provide a scheduler.
- https://github.com/openai/openai-agents-python/blob/main/docs/tracing.md —
  tracing, flush behavior and fail-closed redaction/export boundaries.
- https://openai.github.io/openai-agents-python/usage/ — per-run usage accounting.

No SDK version or license is claimed as adopted. Pin and inspect both before any
future installation. Conversation memory is separate from this utility's mission
status and must not substitute for durable job orchestration.

## Rollback

Close the draft PR without merging to leave production untouched. If eventually
merged, revert its reviewed commit; no data/schema migration or dependency
uninstall is needed. Keep the local Git-metadata state as evidence or archive it
separately; state removal is not required for rollback.

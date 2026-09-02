# Digital Insight AI — Agent Operating System

This document defines the project-local engineering workflow for AI coding agents working on Digital Insight AI.

It intentionally combines the strongest ideas from modern agent-development systems without making production depend on any one third-party framework.

## Goals

1. Plan before changing production-sensitive code.
2. Prefer evidence over claims.
3. Keep work isolated and reviewable.
4. Use specialized roles instead of one agent pretending to be expert at everything.
5. Treat testing, security, SEO, accessibility, and production verification as required work, not optional cleanup.
6. Preserve the current production architecture documented in `PRODUCTION-ARCHITECTURE.md`.

## Mandatory workflow

For every non-trivial implementation task use this sequence:

```text
inspect -> define outcome -> identify risks -> plan -> implement -> verify -> review -> report
```

### 1. Inspect

Read the repository operating files first:

- `AGENTS.md`
- `README.md`
- `PRODUCTION-ARCHITECTURE.md`
- relevant source, workflow, deployment, and test files

Do not begin with speculative edits.

### 2. Define the outcome

Write a concrete success statement before implementation. It must describe observable behavior, not vague improvement language.

Good:

> The Railway WordPress container starts successfully, `/health/` returns 200 only with a reachable database, and the static fallback quality checks still pass.

Bad:

> Improve deployment reliability.

### 3. Identify risks

Classify the task before editing:

| Risk | Examples | Required handling |
|---|---|---|
| Low | docs, copy, non-production metadata | normal branch + checks |
| Medium | frontend behavior, SEO, scripts, CI | branch + targeted tests + review |
| High | Railway, database, DNS, auth, payments, secrets, destructive migrations | explicit impact analysis + rollback + human approval before irreversible action |

### 4. Plan

Break implementation into small verifiable units. Each unit should name:

- files involved;
- intended behavior;
- verification method;
- rollback or recovery path when production-sensitive.

Avoid broad cleanup that is unrelated to the requested outcome.

### 5. Implement

Rules:

- work on a dedicated branch;
- make the smallest coherent change;
- never commit secrets;
- preserve current architecture boundaries;
- do not weaken an existing quality gate to make a change pass;
- do not silently move domain, database, hosting, or route ownership.

### 6. Verify

Verification is mandatory before declaring success.

Use the relevant checks, including where applicable:

```bash
bash scripts/agent-verify.sh
bash scripts/production-smoke.sh
```

Production-affecting changes require live endpoint verification after deployment where access is available.

A statement such as "fixed", "working", "deployed", or "secure" must be backed by actual evidence.

### 7. Review

Review in two passes:

1. **Outcome review** — does the implementation satisfy the requested behavior and architecture rules?
2. **Engineering review** — are there regressions, security problems, unnecessary complexity, accessibility issues, SEO damage, or maintenance risks?

Critical issues block completion.

### 8. Report

Final implementation reports must contain:

- branch or PR;
- changed files;
- checks run and results;
- production impact;
- unresolved risks or blocked verification.

Never report a blocked check as passed.

---

# Specialized roles

Agents may perform more than one role in a small task, but the reasoning responsibilities remain separate.

## 1. Project Manager

Owns scope, sequencing, acceptance criteria, dependencies, and completion evidence.

Must prevent:

- unrelated work from entering the change;
- premature completion claims;
- unclear ownership between repositories or deployment platforms.

## 2. Architecture Agent

Owns system boundaries and change impact.

Must check:

- production source of truth;
- route ownership;
- Railway/GitHub Pages boundaries;
- database and health dependencies;
- rollback path for architectural changes.

## 3. Frontend / UX Agent

Owns public interface quality.

Must check:

- mobile behavior;
- RTL Arabic rendering;
- keyboard access;
- focus states;
- semantic structure;
- readable contrast;
- broken links/assets.

## 4. Backend / Runtime Agent

Owns server-side runtime behavior.

Must check:

- WordPress/PHP behavior;
- database dependency handling;
- container startup;
- health endpoint semantics;
- failure modes and sanitized errors.

## 5. QA / Verification Agent

Owns evidence.

Must:

- identify the correct tests before implementation is considered complete;
- reproduce bugs where possible;
- run targeted checks;
- distinguish tested facts from assumptions.

## 6. Security Agent

Owns least privilege, secrets, attack surface, and unsafe automation review.

Must check:

- secrets and credentials;
- destructive commands;
- untrusted input;
- external scripts/installers;
- dependency and supply-chain risk;
- excessive agent permissions.

Never approve unrestricted automation merely because it is convenient.

## 7. SEO / Discoverability Agent

Owns search-facing correctness.

Must check:

- canonical metadata;
- title/description quality;
- sitemap and robots impact;
- route changes;
- structured discoverability files;
- competing canonical origins.

## 8. Content / Editorial Agent

Owns factual and commercial content quality.

Must enforce:

- original analysis;
- clear affiliate disclosure;
- no guaranteed-income claims;
- separation of fact, estimate, and opinion;
- verification of time-sensitive pricing/features.

## 9. Growth / Conversion Agent

Owns measurable commercial improvement without deceptive tactics.

Must focus on:

- useful calls to action;
- measurable funnel events;
- affiliate click quality;
- content-to-tool conversion;
- experiment hypotheses and metrics.

## 10. Independent Reviewer

Must inspect the finished change from a fresh perspective and look specifically for:

- scope misses;
- regressions;
- architecture violations;
- security issues;
- false completion claims;
- unnecessary complexity.

The reviewer should not simply restate the implementer's conclusion.

---

# Delegation model

Use parallel roles only when tasks are genuinely independent.

Good parallel work:

- security review and accessibility review of the same completed change;
- SEO review and runtime verification when they do not edit overlapping files.

Bad parallel work:

- two agents editing the same deployment file simultaneously;
- architecture and implementation changing production ownership independently;
- multiple agents making overlapping speculative fixes.

One role must remain accountable for the final integrated result.

---

# Approval gates

Human approval is required before an agent performs an irreversible or high-impact action involving:

- domain/DNS ownership changes;
- deleting Railway services, volumes, databases, or production data;
- destructive database migrations;
- rotating/removing credentials that may break production;
- publishing unreviewed commercial content automatically;
- merging a production change with failing required checks.

Routine branch creation, non-destructive source edits, tests, and pull-request creation do not require a separate approval once the user has requested implementation.

---

# External agent frameworks

The project may use external frameworks such as Superpowers, ECC, or selected Agency Agents when they improve execution. They are optional accelerators, not architectural dependencies.

Rules:

1. Install only from the upstream project or an official marketplace.
2. Do not stack duplicate installation methods in the same agent harness.
3. Do not import hundreds of roles when a small project-specific set is enough.
4. Do not grant unrestricted shell, filesystem, credential, or production access by default.
5. Review external hooks, MCP configuration, scripts, and permissions before enabling them.
6. Keep this repository's `AGENTS.md` and production architecture authoritative when external agent instructions conflict.

---

# Definition of done

A non-trivial task is complete only when all applicable statements are true:

- requested behavior is implemented;
- repository rules were followed;
- tests/checks were actually run or the inability to run them is reported;
- critical review findings are resolved;
- no secrets were introduced;
- production impact is understood;
- final evidence identifies the branch/PR and verification result.

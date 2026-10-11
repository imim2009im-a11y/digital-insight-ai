# Agent Platform Core v1

Status: experimental, non-production
Scope: orchestration contract only
Production impact: none until separately reviewed and integrated

## Objective

Add a small, testable control-plane contract for future agent workflows without changing the current website runtime, DNS, hosting, secrets, payments, or production deployment.

## Design principles

1. One accountable control plane owns task state and final evidence.
2. Specialists are bounded workers, not independent production owners.
3. Capabilities are discovered progressively; do not expose every connector/tool to every task.
4. Planning and execution are separate phases.
5. Side-effecting actions require an explicit risk decision before execution.
6. A task cannot be marked successful without machine-verifiable evidence where verification exists.
7. Durable project facts belong in versioned repository artifacts; transient task context does not.
8. Orchestration quality must be testable independently from model quality.

## State machine

```text
RECEIVED
  -> INSPECTED
  -> PLANNED
  -> RISK_CHECKED
  -> EXECUTING
  -> VERIFYING
  -> REVIEWING
  -> SUCCEEDED | BLOCKED | FAILED
```

Invalid shortcuts such as PLANNED -> SUCCEEDED are forbidden.

## Core contracts

### Task
- id
- objective
- scope
- success_criteria[]
- risk: low | medium | high
- capabilities_required[]
- state
- evidence[]
- blockers[]

### Capability
- id
- domain
- description
- side_effects: none | reversible | irreversible
- approval_required
- verification

### Evidence
- type
- command_or_check
- result
- timestamp
- artifact_or_reference

## Capability hierarchy

Start narrow and expand only when required:

```text
research/
engineering/
  source/
  test/
  deployment/
content/
business/
files/
```

A worker receives only the capabilities needed for its bounded task.

## Safety / approval policy

Low risk: inspect, read, analyze, branch-local docs/source edits, non-destructive tests.

Medium risk: CI changes, user-facing behavior, dependency changes, deployment configuration. Requires targeted verification and independent review.

High risk: DNS, production data, authentication, payments, secrets, destructive migrations, deletion of production resources. Requires explicit impact/rollback analysis and human approval before irreversible execution.

## Evidence gate

A success claim must include applicable evidence such as:
- build/test exit status;
- CI run result;
- HTTP status and endpoint;
- schema validation;
- security/static checks;
- deployment identifier.

Narrative statements from an agent are not evidence by themselves.

## Initial integration rule

Do not retrofit every Digital Insight AI component. Prove this contract on one bounded workflow first. Compare:
- completion rate;
- verification failures caught;
- unnecessary tool exposure;
- elapsed time;
- token/cost usage where measurable.

Expand only if measured results justify it.

## Non-goals for v1

- autonomous production deployment;
- unrestricted connector access;
- swarm-style parallelism;
- replacing existing AGENTS.md rules;
- introducing a new hosting/runtime dependency.

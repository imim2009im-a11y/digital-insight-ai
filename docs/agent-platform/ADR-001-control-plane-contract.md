# ADR-001: Start with a bounded control-plane contract

Date: 2026-09-18
Status: proposed on experimental branch

## Decision

Introduce only the minimum contracts needed to evaluate agent orchestration: task state, capability scoping, risk gates, and evidence. Do not introduce a new runtime or production dependency yet.

## Why

The repository already has strong operating rules. The current gap is not a lack of agent roles; it is the absence of a machine-readable task/evidence contract that can later be enforced by tooling.

## Consequences

Positive:
- reduces false completion claims;
- gives future orchestrators a stable interface;
- supports progressive capability disclosure;
- keeps production untouched while the design is tested.

Costs:
- adds schema/process maintenance;
- does not itself execute agents;
- requires a later prototype and measurements before adoption.

## Rejected for now

- large multi-agent swarm;
- exposing all connectors to all workers;
- production deployment of an orchestration service;
- replacing existing repository governance.

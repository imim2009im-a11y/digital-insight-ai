# Digital Insight AI Codex Agents

These are project-specific custom Codex agents written for this repository. They are intentionally small and focused rather than importing a large generic agent collection.

## Included roles

1. Project Manager
2. Architecture
3. Frontend / UX
4. Backend / Runtime
5. QA / Verification
6. Security
7. SEO
8. Content / Editorial
9. Growth / Conversion
10. Independent Reviewer

## Install locally

From the repository root:

```bash
bash scripts/install-codex-project-agents.sh
```

By default the installer copies the agent definitions into:

```text
~/.codex/agents/
```

It prefixes installed files with `digital-insight-ai-` so they do not overwrite unrelated agent definitions. If a prefixed file already exists and differs, the installer creates a timestamped backup before replacing it.

To use another destination:

```bash
CODEX_AGENTS_DIR=/custom/path bash scripts/install-codex-project-agents.sh
```

## Recommended use

Use the Project Manager to scope substantial tasks. Bring in only the specialist roles needed for the change. Finish non-trivial implementation with QA / Verification and Independent Reviewer passes.

Do not dispatch multiple agents to edit the same production-sensitive file concurrently.

## Relationship to external frameworks

The repository can also benefit from external agent-development frameworks, but they are not required for production operation.

- **Superpowers** can add a structured plan/test/review workflow to Codex.
- **ECC** can add a larger engineering skill and security toolset.
- **Agency Agents** demonstrates a broad role catalog and Codex custom-agent integration.

This project keeps its own smaller role set because importing hundreds of generic agents would add unnecessary complexity. `AGENTS.md`, `PRODUCTION-ARCHITECTURE.md`, and `AGENT-OPERATING-SYSTEM.md` remain authoritative when external instructions conflict.

Install third-party frameworks only from their official upstream or official marketplace, review permissions/hooks first, and never stack duplicate install methods for the same framework in the same harness.

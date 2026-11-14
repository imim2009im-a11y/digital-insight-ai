# Contributing

Thanks for your interest in Digital Insight AI.

## Before opening a change

- Keep changes focused and reversible.
- Do not commit credentials, API keys, tokens, private data, or customer information.
- Preserve accessibility, mobile usability, SEO, and the static production architecture under `site/`.
- Do not add Railway, database, or paid-service dependencies to the public static site without an explicit architecture decision.

## Pull requests

A pull request should include:

1. What changed.
2. Why the change is needed.
3. How it was tested.
4. Risks and rollback steps when relevant.

For production-facing changes, run the repository's verification scripts and ensure GitHub Actions pass before merge.

## Security

Do not report vulnerabilities in public Issues. See [SECURITY.md](SECURITY.md).

## Scope

Small fixes, documentation improvements, accessibility work, test coverage, and evidence-backed product improvements are preferred over broad rewrites.

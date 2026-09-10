# Security Policy

## Security baseline

This repository follows a security-first policy:

- Never commit API keys, passwords, tokens, private keys, or production credentials.
- Client-side code must contain only intentionally public configuration.
- Authentication and authorization must be enforced server-side or at the database policy layer.
- Production diagnostics and debug collectors are disabled by default.
- Dependencies must be reviewed before upgrades and lockfiles must be respected in CI.
- Security findings must be fixed or explicitly documented before production release.

## Reporting

Do not publish sensitive vulnerability details in a public issue. Report suspected vulnerabilities privately through the repository owner or GitHub's supported private reporting mechanism.

## Production gate

A release is not considered production-ready while confirmed Critical or High security findings remain unresolved, or while confirmed secrets are exposed in active source or production artifacts.

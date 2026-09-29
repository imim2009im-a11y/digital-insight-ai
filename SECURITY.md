# Security Policy

## Reporting a vulnerability

Please do **not** disclose security vulnerabilities in public GitHub Issues.

If you discover a potential vulnerability in Digital Insight AI:

1. Do not include secrets, credentials, personal data, or exploit details in a public issue.
2. Contact the repository owner privately through the contact methods listed on the GitHub profile.
3. Include a concise description, affected component, reproduction conditions, and potential impact.
4. Allow reasonable time for validation and remediation before public disclosure.

## Scope

Security reports are most useful when they affect:

- the production site at `digitalinsightai.com`,
- GitHub Actions and deployment workflows,
- source-code integrity,
- credential or secret exposure,
- dependency or supply-chain risk,
- authentication or authorization boundaries in supporting services.

## Out of scope

- Automated traffic or denial-of-service testing.
- Social engineering.
- Reports based only on missing headers that are outside the capabilities of the current hosting platform and are already tracked.
- Findings that require access to accounts or systems you are not authorized to test.

## Operational principles

- No secrets in source control.
- Minimum required permissions.
- Reversible production changes.
- Evidence-based verification before declaring a security issue fixed.

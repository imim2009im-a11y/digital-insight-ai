# Digital Insight AI — Website Health Audit | Pilot Offer

Status: **Draft / not published / not yet validated on live production**  
Prepared: 2026-10-31

## Who this is for
Small Saudi service businesses and online shops with an existing public website, a defined business goal, and a person authorized to approve a technical review.

## Value proposition
A human-reviewed, evidence-backed audit of website quality and technical hygiene. The value is diagnosis, prioritization and verification guidance, not merely a Lighthouse score.

## Pilot package (hypothesis, not a market benchmark)
- **Standard pilot price:** SAR 349 for up to **three agreed public pages**.
- **Basic comparison:** SAR 199 / one public page.
- **Advanced comparison:** SAR 749 / up to eight agreed public pages.
- Prices are provisional; check current scope, tax treatment, business eligibility and hours before quoting. No income or search-ranking guarantees.
- Optional remediation **not included**; quote separately after authorization.
- Target effort for Standard: 3–4 working hours (assumption; measure actual time).

## Included in Standard
1. Kickoff: goals, page URLs, written permission and exclusions.
2. Desktop and mobile assessment using Lighthouse / PageSpeed Insights where available.
3. Basic on-page SEO (titles, description, canonical, indexability indications; no ranking guarantee).
4. Accessibility spot-check (labels, keyboard focus, contrast, obvious blockers; not a full WCAG certification).
5. Passive review of public HTTPS and relevant response headers (not penetration testing).
6. Manual user-journey observations for contact or purchase enquiry.
7. Report with evidence, confidence, priority, proposed fix and re-test method.
8. One 20-minute report walkthrough subject to availability.

## Not included
No vulnerability exploitation, authentication testing, network scanning, malware scanning, production changes, database access, credential handling, account access, payment handling, custom coding, load testing, legal compliance certification, or guaranteed business outcomes.

## Data and approval gate
- Do not begin domain-specific checks beyond ordinary browsing until a site owner or delegated representative approves the targets, allowed tools, time window and data handling.
- Do not submit forms with personal information or transmit site details to third-party analyzers without approved scope.
- Do not collect customer records or credentials. Redact sensitive content in screenshots.
- Use approved storage, restricted access and an agreed retention/deletion period; do not state one as agreed until the client approves.
- Do not send marketing messages using personal data without verifying the lawful basis and required consents/opt-out controls under Saudi PDPL.
- Commercial contracting, invoicing and accepting payment must use a legally eligible person or entity; Saudi freelance certificate eligibility includes an 18+ age requirement. Do not work around eligibility limits.

## Deliverables and acceptance
- 1 PDF or shared document report (final format chosen with customer).
- Evidence register: issue ID, URL, date, tool/version, measured observation, reproduction instructions/screenshot, impact, confidence.
- P0/P1/P2 correction plan and a one-page executive summary.
- Quality gate: no fabricated scores or vulnerabilities, evidence for every finding, independent read-through, customer data redaction.
- Success: customer can identify the top three technically justified improvements, owner/effort and a measurable re-test; no promise that those improvements increase revenue.

## Readiness blockers (must verify)
- Confirm which deploy currently owns `digitalinsightai.com`; repo architecture from 2026-09-18 names `site/` on GitHub Pages as target and Railway as temporary rollback.
- Verify the public contact form works via an approved test, not by source inspection alone.
- Verify current homepage doesn't contain placeholder testimonials/claims. A web index fetched 2026-10-31 showed an older marketing homepage, but may be stale.
- Publish this offer only after legal/operational readiness, real contact route validation and explicit content review.

## Sources
- Internal: `AGENTS.md`, `PRODUCTION-ARCHITECTURE.md`, `site/index.html`, `site/contact/index.html`.
- Official: https://developer.chrome.com/docs/lighthouse/overview
- Official: https://pagespeed.web.dev/
- Official: https://freelance.sa/ar/faqs
- Official: https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/b7cfae89-828e-4994-b167-adaa00e37188/1

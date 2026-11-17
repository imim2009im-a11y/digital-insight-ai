# Digital Insight AI — Growth / Trust Pilot (Draft, 2026-11-04)

Status: **review only**. No publication, production changes, account outreach, DNS moves, or new collection of personal data is authorized by this note.

## Source of truth and verified observations
- Repository: `imim2009im-a11y/digital-insight-ai`; public-site source is `site/` under `AGENTS.md` and `PRODUCTION-ARCHITECTURE.md`.
- The repository's `site/index.html` is an Arabic RTL AI tools and review website. It does **not** contain the placeholder testimonial text seen in an old third-party-cached homepage.
- The retrieved public homepage snapshot contains `Contact Form Demo`, generic experience claims, and lorem-ipsum testimonials. The snapshot is old, and the web fetch did not establish whether those placeholders are still served by the current production host. **Do not report the live site fixed or broken from this snapshot alone.**
- The architecture document dated 2026-09-18 describes an **incomplete** migration from Railway to GitHub Pages. Current DNS, GitHub Pages publishing configuration, and HTTPS must be checked before making production claims or modifying deployment.
- The GamsGo `/share/KatmA` referral program offers non-withdrawable platform points; it is not a cash-revenue plan and should not be presented as such.
- The original homepage copy described proposed third-party affiliate rates as a “verified revenue opportunity” while acknowledging that acceptance was pending. The related copy is softened in this draft to avoid implying approval or actual income.

## P0 — Trust and safety acceptance gate (blocking)
1. Compare the **live rendered** `/`, `/guides/`, `/tools/`, `/about/`, `/privacy/`, and `/contact/` with the repository's `site/` version. Record UTC timestamp, HTTP status, page source/version, screenshot and canonical URL.
2. If generic testimonials, fabricated credentials, “demo” contact labels, or unverifiable ROI claims are visible on the live site, identify the **actual production owner** before proposing an edit. No speculative migration or deletion.
3. Verify `/contact/` privacy notice and endpoint are still accurate without submitting a message or processing real personal data.
4. Confirm canonical domain, HTTPS, redirects, robots, sitemap and no duplicate production owner.
5. Do not publish affiliate, advertising or paid-services promotions until legal capacity, local advertising/business requirements and applicable program eligibility have been verified for the intended operator.

## P1 — Editorial QA of the four offline pilot drafts
| Draft | Source/QA result | Decision |
|---|---|---|
| 01 — AI tool evaluation | No live product testing claimed. Material overlaps `site/guides/choose-ai-tools-for-business/`; lacks first-hand case study. | HOLD — enrich existing guide instead of duplicating URL |
| 02 — Core Web Vitals | Google documents the LCP / INP / CLS definitions; verify exact values and distinguish field from lab metrics before publication. | CONDITIONAL — factual check passed; original field example and editor review still required |
| 03 — AI data privacy | Security advice is general; any Saudi regulatory statement needs review against current official text for context and exceptions. | HOLD — legal/source review |
| 04 — Original SEO content workflow | Consistent with Google people-first content guidance but overlaps the site's methodology and existing guides. | HOLD — reuse as editorial checklist |

No article is published by this PR. The original drafts remain in the separately delivered local pilot package.

### Sources reviewed (official)
- Google people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google Search Console overview: https://developers.google.com/search/docs/monitor-debug/search-console-start
- Google Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Saudi National Data Governance Platform: https://dgp.sdaia.gov.sa/

## P2 — 14-day evidence-first measurement (NO invented measurements)
| Metric | Definition | Source | Initial status |
|---|---|---|---|
| Search impressions | Impressions of selected pages during a fixed date range | Google Search Console | NOT MEASURED |
| Search clicks | Search clicks for the same pages/date range | Google Search Console | NOT MEASURED |
| Search CTR | Search clicks / impressions, only where impressions > 0 | calculated from Search Console | NOT MEASURED |
| Organic landing pages | Pages receiving organic search clicks | Search Console | NOT MEASURED |
| Incoming relevant inquiries | Count of **voluntary** inbound requests relevant to technical content/services, without copying names/emails to tracking | Existing contact channel, aggregated manually | NOT MEASURED |
| Hours spent | Actual hours for research, production, and review | Internal time log | NOT MEASURED |
| Cash received | Verified legitimate net income, only if legally eligible and with audited record | Accounting record | NOT MEASURED |

**Decision rule:** No market demand or expected income is inferred from pageviews alone. On day 14, if no valid evidence exists, extend/adjust a small informational test without buying traffic. If inbound interest exists, investigate age/legal eligibility and authorized offering before contracting. Never publish fictitious conversions.

## Change constraints and verification
- Scope: source-copy adjustment + this documentation, on a dedicated `codex/*` branch.
- No changes to `main`, DNS, hosting, form endpoint, secrets, analytics scripts, ads or autopublishing.
- Verify exact copy change; ensure header/navigation/links are preserved.
- Full repository `bash scripts/agent-verify.sh` and live smoke test are **not run** in the connector-only environment; require CI status and post-approval staging review before merge.
- Independent review should confirm that softening the claim does not break attribution/disclosures or invent a marketing endorsement.

## Exit criteria before a merge or launch
1. Source-of-truth host and live current pages verified.
2. CI quality gate passes and page is reviewed on desktop/mobile RTL.
3. No deceptive claims, unverifiable reviews, or false income guarantees.
4. No new tracking without a privacy and consent assessment.
5. A responsible adult/authorized representative confirms legal eligibility before any contract, paid advertising, affiliate or cash-payout activity where needed.

# Digital Insight AI — engineering implementation and release audit
Date: 2026-11-04
Status: **Draft / not deployed**. Changes proposed in [PR #118](https://github.com/imim2009im-a11y/digital-insight-ai/pull/118).

## Baseline and source of truth

- `site/` is the public static HTML/CSS/JavaScript surface and its canonical URLs are under `https://digitalinsightai.com/`.
- Production Pages workflow: `.github/workflows/pages-staging.yml`; publishing is triggered by changes on `main`, not by this draft PR.
- `site/guides/` currently lists three real published editorial guides; do not synthesize additional topics or fictitious dates.
- `site/tools/` currently includes 11 static tool cards with a minimal compare/search experience; individual detail and commercial facts are only as reliable as their published sources.
- The optional React app in `ai-tools-directory/client/` is separate from the static production source and does not justify a full-site rewrite.
- Evidence files: `README.md`, `PRODUCTION-ARCHITECTURE.md`, `site/DEPLOY.md`, `site/sitemap.xml`, `site/assets/directory.js`.

## Verified code changes in the review branch

1. Turn `/guides/` into a responsive RTL discovery library with local Arabic-normalized search, article-topic filters, sorting, clear empty state and three existing article links.
2. Preserve existing canonical URLs, headings, article content, header/footer, privacy links and published navigation.
3. Improve homepage value proposition, tools discovery and explicit comparison navigation.
4. Repair directory category deep-link handling (including `marketing`), add normalized Arabic tool search, and expose a comparison shortcut when two or three tool cards are selected.
5. Render only substantiated category, use-case and published review links in comparison; do not guess prices, free plans, Arabic-language support, privacy guarantees, star ratings, or affiliate earnings.
6. Extend browser E2E and unit tests; add the available deploy preflight and response-header observation checks.

## Security and SEO risks requiring production observations

| Priority | Observation | Risk | Safe next action | Acceptance evidence |
|---|---|---|---|---|
| P0 | `site/_headers` is present but GitHub Pages does **not** process Cloudflare/Netlify `_headers` format | Browser protections may not be delivered in live HTTP responses | Observe HTTPS response headers on canonical routes; choose explicit hosting-level policy only after reviewing infrastructure and approvals | Captured live HTTP headers with CSP, frame protection, nosniff, referrer policy and HSTS as applicable |
| P0 | `site/_redirects` is not a GitHub Pages redirect ruleset | Historical URLs may lack real 301/308 redirects and lose link equity | Inventory old URL responses, then implement **server-side** redirects only on a confirmed supporting hosting layer | Each old URL returns 301/308 directly to relevant final canonical URL |
| P1 | Production header and redirect behavior has not been measured from this environment | Cannot declare security or SEO compatibility verified | Run the read-only site monitor from an authorized environment with working DNS | Per-route URL, final origin, status, Location, security header values and timestamp |
| P1 | Catalog facts are embedded in HTML cards, not one versioned source | Drift between reviews, prices, comparison fields and claims | Design a small validated static data catalog only after inventorying current cards and data provenance | No mismatched claims, no unsourced pricing/ratings |
| P1 | No before/after field performance evidence is established in this review | Cannot claim LCP/INP/CLS or Lighthouse improvement | Obtain real-world CrUX/GSC data and repeatable Lighthouse test baselines before release | Report by page and device; compare the same methodology |
| P2 | Full keyboard and screen-reader manual audit is pending | Automated tests cannot prove complete WCAG 2.2 AA conformance | Keyboard/screen-reader manual QA on mobile and desktop | Documented results and fixes |

Do not rewrite `_headers` or `_redirects` as if GitHub Pages supported them. Do not change DNS, hosting, production secrets, paid services, or provider integrations in this PR.

## Read-only HTTP verification (when network access is available)

```bash
curl -sS -D - -o /dev/null --max-time 15 https://digitalinsightai.com/
curl -sS -D - -o /dev/null --max-time 15 https://digitalinsightai.com/guides/
curl -sS -D - -o /dev/null --max-time 15 https://digitalinsightai.com/tools/
curl -sS -D - -o /dev/null --max-time 15 https://digitalinsightai.com/tools.html
curl -sS -D - -o /dev/null --max-time 15 https://digitalinsightai.com/contact.html
```

**Interpretation:** A successful response or an HTML refresh is **not** evidence of an HTTP 301. The actual HTTP status and Location header are decisive. Do not claim absent security headers are enforced just because configuration files exist.

## Local and CI acceptance gates

```bash
python3 scripts/site-professional-check.py
python3 scripts/build-news-feed.py
python3 scripts/test_deploy_preflight.py
python3 -m unittest discover -s scripts -p test_response_security.py
node --check site/assets/directory.js
node --check site/assets/guides.js
node --test scripts/site-interactions.test.cjs scripts/guides-library.test.cjs
```

- CI browser harness in `scripts/site-browser-e2e.cjs` checks canonical pages at 320/390/768/1365 px, Arabic guides filters and tool comparisons.
- QA gates passing on a PR confirm tested code on the branch only, not what the public domain serves today.
- Release is intentionally blocked until separate review of actual HTTP behavior, manual RTL visual inspection, and successful production readiness checks.

## Architecture recommendation

Keep the zero-paid-dependency static production core while it adequately serves public content. Prefer small, testable progressive enhancements over moving all pages to React or adding a database. Model any future AI Tool Advisor with deterministic matching against validated published facts before adding models, APIs, analytics or personal-data collection.

## References

- GitHub Pages static hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- GitHub Pages publishing and environment protection: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Google Search site migration and permanent redirects: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Cloudflare Pages special header syntax (not a GitHub Pages feature): https://developers.cloudflare.com/pages/configuration/headers/

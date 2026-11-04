# Digital Insight AI — public HTTP and release readiness evidence

**Observation date:** 2026-11-04 09:33:38 UTC  
**Scope:** publicly accessible HEAD responses only, no redirect following, no credentials, no site mutations.  
**Evidence:** [GitHub Actions public HTTP audit, run 41808508406](https://github.com/imim2009im-a11y/digital-insight-ai/actions/runs/41808508406) (job `Read-only public HTTP evidence`).  
**Release status:** **HOLD — not approved for merge or deployment.**

## Observed production behavior

| URL path | Status returned to HEAD | Important conclusion |
| --- | --- | --- |
| `/` | 200 | HTML route reachable |
| `/tools/` | 200 | HTML route reachable |
| `/guides/` | 200 | HTML route reachable |
| `/contact/` | 200 | HTML route reachable |
| `/tools.html` | 404 | No HTTP permanent redirect observed |
| `/start.html` | 404 | No HTTP permanent redirect observed |
| `/methodology.html` | 404 | No HTTP permanent redirect observed |
| `/privacy-policy.html` | 404 | No HTTP permanent redirect observed |

For all four canonical routes, the observation did **not** include these headers: `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options`. A `frame-ancestors` CSP directive or `X-Frame-Options` was also not observed. The reported `Server` header was `GitHub.com`.

**Interpretation limits:** This is a dated HEAD-only network observation, not a GET/browser security audit, not a claim of exploitable vulnerabilities, and not proof of every route. No assumption is made that the files `site/_headers` and `site/_redirects` affect GitHub Pages HTTP behavior. A successful PR CI run cannot retroactively fix production.

## P0 — release blockers requiring actual hosting-level changes or approval

1. **Security response policies:** determine whether existing production hosting can set real CSP, framing protection, nosniff, referrer and HSTS response headers. Start with a non-production test route and review effect on contact submissions and external links. Do not turn on broad HSTS `includeSubDomains` or CSP enforcement without full host inventory and rollback plan. No DNS or paid-hosting migration is authorized in this PR.
2. **Permanent historical redirects:** provide real 301/308 status + exact `Location` from a verified proxy/CDN/web server when approved. Each path must map directly to its relevant canonical route. Do not misreport a `meta refresh` fallback as a server-side redirect.
3. **Rollback:** before touching hosting, document the current DNS, public certificate chain, Pages target and a tested rollback to the current known-good state. No hosting configuration was changed.

## P1 — safe temporary navigation repair in this draft branch

This branch now includes **eight static fallback HTML entrypoints** matching the intended mappings in `site/_redirects`:

`/tools.html` -> `/tools/`, `/start.html` -> `/guides/`, `/methodology.html` -> `/about/`, `/editorial-policy/` -> `/about/`, `/privacy-policy.html` -> `/privacy/`, and three older comparison paths -> `/reviews/`.

The static pages use an instant HTML `meta refresh`, a canonical URL, a `noindex` marker and an accessible clickable fallback. **They do not produce HTTP 301.** Google recognizes a zero-second meta refresh as a redirect signal when server-side redirects are not feasible, but explicitly recommends server-side permanent redirects when possible.

Source-of-truth: `site/_redirects`. Run `python3 scripts/sync_legacy_routes.py --check` to ensure all eight files exist and exactly match the approved mapping; `--write` regenerates them in a feature branch. Static SEO validators exclude these intentionally duplicated canonical fallback documents from `sitemap.xml`, but check their destinations. Browser QA follows all eight in a local static server.

## P1 — verified official outbound destinations

The catalog includes official-provider URLs for all seven sponsored cards. Six sponsored links lead to a third-party intermediary, while the Synthesia referral goes directly to the vendor domain. Each such card exposes the official site and an independent evidence link, and retains the original sponsored link with correct `rel=sponsored`. No affiliate links were removed, changed, or followed in the test suite. The official links were verified against provider pages; these sources establish domains, **not product quality, pricing, resale authorizations, or vendor endorsements of intermediaries**.

## Acceptance before release

- [x] Official-provider link data and sponsor disclosures added to draft code.
- [x] Public HEAD baseline captured on 2026-11-04 from GitHub Actions.
- [x] Eight HTML fallback files added and regression coverage added in draft.
- [ ] Latest code branch fully green in all GitHub Actions jobs after final commits.
- [ ] Independent visual inspection and keyboard/screen-reader navigation review.
- [ ] Real GET response review and security policy baseline approved.
- [ ] Permanent redirect strategy and safe hosting path agreed.
- [ ] Field performance baseline obtained (LCP, INP and CLS by device).

**Nothing has been merged into `main`; no DNS, authentication, accounts, billing, contact endpoint or production settings were changed.**

## References

- Google Search Central redirect guidance: https://developers.google.com/search/docs/crawling-indexing/301-redirects
- Google paid link disclosure: https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Core Web Vitals: https://web.dev/articles/vitals

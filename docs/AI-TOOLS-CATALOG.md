# AI tools catalog — source of truth and verification

Date: 2026-11-04 · Status: isolated draft PR, not deployed.

## Architecture

- `site/data/tools.json` is the versioned editorial source for all published AI tool cards.
- `scripts/sync_tools_catalog.py` validates this JSON and generates the entire `<div class="grid tools">` block in `site/tools/index.html`.
- `site/assets/directory.js` provides progressive DOM search/compare over the generated HTML; the cards remain readable without JavaScript.
- `site/assets/advisor.js` loads only same-origin `../data/tools.json` and matches the user's selected **task category**; it never calls an AI model or sends answers to a remote service.
- GitHub Actions QA and production preflight run `python3 scripts/sync_tools_catalog.py --check`; mismatched HTML fails closed.
- PHP/database/React migration is unnecessary for this tranche.

## Data provenance and limitations

There are **11 entries migrated from existing editorial HTML cards**. This migration does not independently establish vendor features, pricing, trial availability, Arabic support, privacy, contract terms, or affiliate eligibility.

Required fields per tool: stable `id`, `name`, `category`, `categoryLabel`, `focus`, `description`, optional `review`, existing `external` link and its `sponsored` disclosure. `evidence` explicitly records the legacy editorial origin; `externalVerificationDate` is `null` because no independent verification date is established for the migrated records.

`unknown` explicitly keeps `freePlan`, `price`, `arabicSupport`, and `privacy` set to `null`. The validator rejects attempts to put asserted values into these fields without first changing the data model and adding authoritative source evidence. An unknown value is **not** a negative or positive claim.

Any future source-of-facts expansion requires: named official vendor source, exact claim, reviewed URL, observation date and market, and a test that forbids publishing facts without that provenance. Never populate empty fields from marketing imagination or an unreviewed AI response.

## Safe editorial update workflow

1. Edit `site/data/tools.json` in a feature branch.
2. For a new tool, supply exactly the published name, task category, readable plain-text description, reviewed destination and optional actual local review page. Unverified commercial facts must remain null.
3. Run `python3 scripts/sync_tools_catalog.py --write` to regenerate the static cards.
4. Run `python3 scripts/sync_tools_catalog.py --check`, `python3 -m unittest discover -s scripts -p test_tools_catalog.py`, `python3 scripts/site-professional-check.py`, `node --check site/assets/directory.js`, `node --check site/assets/advisor.js`.
5. Review the generated HTML diff, verify external links' legitimacy and any sponsored relationship, and run the browser E2E suite.
6. Obtain independent release approval; do not merge or change DNS/hosting automatically.

The validator checks unique IDs, allowed categories, review paths, HTTPS URLs, required text, provenance and null-only unknown fields. The renderer HTML-escapes all dynamic text. The advisor uses `textContent` and creates only vetted local review and card links.

## Advisor recommendation policy

- Candidate selection: tools whose **published category** matches the chosen task.
- Order: alphabetical, **not a quality score, sponsorship priority or profitability ranking**.
- If a user selects a price constraint, Arabic requirement, privacy constraint or enterprise context, show the relevant verification gap. Do not claim that any suggestion satisfies an unverified constraint.
- Display existing review links where available, and a clear missing-review note otherwise.
- No personal data, accounts, tracking, model APIs, subscriptions or vendor contact is required.
- If the local JSON is unavailable or invalid, keep the form hidden and show a truthful failure message instead of guessed recommendations.

## Operational and release checks

- Source: `site/data/tools.json`
- Generated content: `site/tools/index.html`
- User interfaces: `site/assets/directory.js`, `site/assets/advisor.js`, and their CSS
- CI: `.github/workflows/professional-site-checks.yml`
- Production preflight: `.github/workflows/pages-staging.yml`
- E2E: `scripts/site-browser-e2e.cjs`

This implementation does **not** claim full WCAG 2.2 AA compliance, measured Core Web Vitals, validated vendor pricing, verified security response headers, or a completed production deployment.

## External standards

- OWASP DOM-based XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- W3C WCAG 2.2, status messages and accessibility: https://www.w3.org/TR/WCAG22/
- GitHub Pages official source and deployment: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Google structured data content consistency: https://developers.google.com/search/docs/appearance/structured-data/sd-policies

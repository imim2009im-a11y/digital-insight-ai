# Custom-domain migration audit

Updated: 2026-10-07

## Canonical production origin

The public canonical origin is `https://digitalinsightai.com/`.
The retired GitHub Pages origin is `https://imim2009im-a11y.github.io/digital-insight-ai/` and is expected to redirect to the canonical domain rather than be indexed independently.

## Verified production state

- `site/robots.txt` announces `https://digitalinsightai.com/sitemap.xml`.
- `site/sitemap.xml` contains only `https://digitalinsightai.com/` URLs.
- Production HTML under `site/` uses the custom domain for canonical URLs.
- Google Search Console ownership for `https://digitalinsightai.com/` was confirmed on 2026-10-06.
- Search Console may report the retired GitHub Pages property as “Page with redirect”; that is expected while the redirect points to the canonical domain.

## Repository safeguards

- The static quality gate rejects the retired GitHub Pages origin if it reappears inside the production `site/` artifact.
- The public-site monitor verifies that the retired GitHub Pages root resolves to the canonical HTTPS domain.
- Staging fixtures, migration documentation and test scripts may still mention the retired origin when they are explicitly testing migration behavior; those references are not production discovery signals.

## Operational rule

Do not attempt to make both origins independently indexable. Redirects, `rel="canonical"`, internal links and the production sitemap should all converge on `https://digitalinsightai.com/`.

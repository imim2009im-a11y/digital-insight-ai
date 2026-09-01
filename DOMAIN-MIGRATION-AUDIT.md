# Custom-domain migration audit

Date: 2026-09-01

## Confirmed issue

The repository was configured with the GitHub Pages custom domain `digitalinsightai.com`, but several machine-readable discovery files still referenced the previous GitHub Pages origin `https://imim2009im-a11y.github.io/digital-insight-ai/`.

## Fixed in this branch

- `robots.txt`
- `sitemap.xml`
- `google-sitemap.xml`
- `sitemap.txt`

These now use `https://digitalinsightai.com/` as the public origin.

## Remaining follow-up

Several HTML canonical/Open Graph URLs and documentation files still contain the old GitHub Pages origin. They should be migrated deliberately in a follow-up change, with visual and link validation, rather than bulk-replaced without review.

## Validation requirement

Before merging any follow-up URL migration:

1. Run the static site quality gate.
2. Confirm canonical URLs use the custom domain.
3. Confirm relative internal links still resolve correctly on GitHub Pages/custom-domain hosting.
4. Confirm Search Console is submitted only the primary `sitemap.xml`.

# AGENTS.md

## Project scope

Digital Insight AI is a static Arabic GitHub Pages website focused on practical AI-tool discovery, comparisons, affiliate content, and lead generation.

## Non-negotiable rules

1. Preserve Arabic language quality and right-to-left layout.
2. Do not publish exaggerated income claims or guaranteed results.
3. Keep affiliate disclosures visible and accurate.
4. Never commit API keys, tokens, passwords, private email data, or Formspree secrets.
5. Preserve the GitHub Pages base path `/digital-insight-ai/` in internal asset and navigation handling.
6. Do not remove `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, or `sitemap.md` without a documented replacement.
7. Validate links and page paths before deployment.
8. Keep pages usable on mobile devices and accessible by keyboard.
9. Prefer small, reviewable changes over broad rewrites.
10. Update sitemap files when public pages are added, renamed, or removed.

## Required checks before merging

- Open the main page and all modified pages locally.
- Confirm there are no broken local asset paths.
- Confirm Arabic text is displayed correctly.
- Confirm forms keep their intended endpoint and validation.
- Confirm affiliate links are clearly disclosed.
- Confirm public pages are represented in `sitemap.xml` and `sitemap.md`.
- Confirm machine-readable project summaries remain accurate.

## Content standards

- State limitations as clearly as advantages.
- Separate verified facts from opinion and estimates.
- Use concrete examples and practical recommendations.
- Avoid copying vendor marketing language.
- Record a real update date when materially changing a comparison.

## Deployment

The production site is hosted on GitHub Pages from this repository. Changes to the default publishing branch may trigger deployment automatically, depending on the repository workflow settings.

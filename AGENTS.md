# AGENTS.md

## Mission

Digital Insight AI is the production repository for a static Arabic GitHub Pages website focused on practical AI-tool discovery, comparisons, affiliate content, lead generation, and trustworthy original analysis.

Codex should improve this repository conservatively: preserve what works, validate every meaningful change, and prefer small reviewable patches over broad rewrites.

## Repository source of truth

- This repository is the production source for the legacy/static GitHub Pages site at `/digital-insight-ai/`.
- The nested `ai-tools-directory/` directory is a **legacy snapshot** and must not receive new product development.
- Active development of the modern AI tools/blog application belongs in the separate repository `imim2009im-a11y/ai-tools-directory`.
- Do not copy changes automatically between the nested snapshot and the standalone repository.
- If a migration is required, compare deliberately, document the migration, and keep one clear source of truth.

## Codex operating protocol

1. Read this file and `README.md` before making changes.
2. Inspect the relevant files and existing Git history before editing.
3. Start new work from `main` unless the task explicitly targets another branch.
4. Use a dedicated work branch for non-trivial changes, preferably `codex/<short-task-name>`.
5. Never force-push, rewrite shared history, or delete working features without an explicit task requiring it.
6. Do not merge unrelated cleanup into a focused task.
7. If repository state conflicts with the task, stop and report the conflict instead of guessing.
8. When a change affects production behavior, verify it locally before proposing merge.
9. Summarize changed files, checks run, remaining risks, and deployment impact at the end of each task.

## Non-negotiable product rules

1. Preserve high-quality Arabic and correct right-to-left layout.
2. Do not publish exaggerated income claims, guaranteed results, fake testimonials, or unverified performance claims.
3. Keep affiliate disclosures visible, accurate, and close enough to relevant commercial content.
4. Never commit API keys, tokens, passwords, private email data, cookies, `.env` files, private keys, certificates, or service secrets.
5. Preserve the GitHub Pages base path `/digital-insight-ai/` in internal asset and navigation handling.
6. Do not remove `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, or `sitemap.md` without a documented replacement.
7. Validate links and page paths before deployment.
8. Keep pages usable on mobile devices and accessible by keyboard.
9. Preserve semantic HTML, readable contrast, useful alt text, and visible focus states.
10. Update sitemap files when public pages are added, renamed, or removed.
11. Do not modify `ai-tools-directory/` except for an explicitly approved migration or removal task.
12. Avoid introducing unnecessary frameworks or build systems into the static root without a clear benefit and explicit task scope.

## Static-site architecture

- Root production pages are static HTML/CSS/JS served by GitHub Pages.
- `.nojekyll` and `CNAME` are deployment-sensitive files; do not remove or rewrite them casually.
- `_config.yml` may affect Pages/Jekyll metadata even though `.nojekyll` is present; inspect before changing.
- `.github/workflows/static-quality.yml` is the repository quality gate for `main` and pull requests.
- Keep public paths compatible with both direct GitHub Pages hosting and the configured custom domain when possible.

## Required checks before merge

For any modified public page or asset:

- Open the main page and all modified pages locally.
- Confirm there are no broken local `href` or `src` targets.
- Confirm Arabic text renders correctly and RTL layout remains intact.
- Confirm forms keep their intended endpoint and client-side validation.
- Confirm affiliate links are clearly disclosed where relevant.
- Confirm public pages are represented in `sitemap.xml` and `sitemap.md` when applicable.
- Confirm `robots.txt`, `llms.txt`, and `llms-full.txt` remain accurate after structural/content changes.
- Confirm mobile layout at narrow viewport widths.
- Confirm keyboard navigation and visible focus for interactive elements.
- Confirm no secrets or sensitive deployment files were added.

### Recommended local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then inspect the relevant pages through the local server instead of relying only on file previews.

### CI expectation

The GitHub Actions workflow `.github/workflows/static-quality.yml` must remain green. It validates required public files, local links/assets, and rejects sensitive deployment material.

## Content standards

- State limitations as clearly as advantages.
- Separate verified facts from opinion, estimates, and future plans.
- Use concrete examples and practical recommendations.
- Avoid copying vendor marketing language.
- Prefer original analysis and comparison over rewritten announcements.
- Record a real update date when materially changing a comparison or product review.
- For time-sensitive claims such as pricing, features, availability, or model capabilities, verify the claim before publication.

## SEO and discoverability

When adding or materially changing a public page:

- Use a unique, descriptive `<title>` and meta description.
- Keep one clear primary heading.
- Add canonical metadata when appropriate.
- Preserve useful Open Graph/social metadata when present.
- Use internal links naturally; do not create keyword-stuffed navigation.
- Update sitemap and machine-readable summaries when the page should be discoverable.

## Security and privacy

- Treat all user-submitted form data as private.
- Do not add analytics or third-party scripts that collect personal data without documenting the privacy impact.
- Avoid inline secrets, private endpoints, or credentials in HTML/JS.
- Prefer least-privilege integrations and public-safe identifiers.
- If a task touches authentication, payments, personal data, DNS, deployment credentials, or third-party account access, describe the risk before making an irreversible change.

## Git and review discipline

- Base normal feature/fix work on `main`.
- Use descriptive commits focused on one logical change.
- Prefer pull requests for non-trivial work.
- Do not merge a PR with failing required checks.
- Do not mix Dependabot/security branches into unrelated feature work.
- Keep old audit/security branches as historical work unless the task specifically asks to continue them.

## Definition of done

A Codex task is complete only when:

1. The requested change is implemented, not merely described.
2. Relevant files were inspected for unintended side effects.
3. Appropriate local checks were run where the environment permits.
4. CI impact is understood and any failures are reported precisely.
5. The final response lists the branch/commit or PR, files changed, checks performed, and any remaining limitation.

## Deployment

The production site is hosted from this repository through GitHub Pages. Changes merged into the default publishing branch may deploy automatically depending on repository workflow and Pages settings. Treat `main` as production-sensitive.

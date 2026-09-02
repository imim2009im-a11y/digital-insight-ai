# AGENTS.md

## Mission

Digital Insight AI is a production-sensitive repository for one commercial product with two temporary delivery surfaces:

1. the primary WordPress application built and deployed to Railway from this repository; and
2. the legacy/static Arabic GitHub Pages surface retained as a fallback/reference layer during consolidation.

Agents must improve the product conservatively, preserve working production behavior, and prevent the two surfaces from evolving into competing products.

## Required reading

Before any non-trivial change, read:

1. `AGENTS.md`
2. `README.md`
3. `PRODUCTION-ARCHITECTURE.md`
4. the relevant deployment or source files for the task

If these files disagree with observed live infrastructure, stop and report the conflict before changing production behavior.

## Source-of-truth model

### Canonical product

The product is **Digital Insight AI** under the canonical domain `digitalinsightai.com`.

### Railway production

- Railway project: `Digital Insight AI WordPress`
- Production service: `DigitalInsightProduction`
- Source repository: this repository
- Runtime: WordPress
- Health path: `/health/`
- Database: Railway MariaDB

Railway owns the canonical custom domain during the current WordPress cutover. Do not attach the same domain to GitHub Pages, Vercel, Render, or another host as a quick workaround.

### Static GitHub Pages fallback

The root static HTML/CSS/JS site remains a fallback/reference surface. It must stay usable on the repository GitHub Pages path, but it is not a second independent editorial product.

The `CNAME` file must remain absent while Railway owns the custom domain. The repository quality gate enforces this.

### Modern tools application

The standalone repository `imim2009im-a11y/ai-tools-directory` is the source of truth for modern tools-directory application development.

The nested `ai-tools-directory/` directory in this repository is a frozen legacy snapshot. Do not develop it or copy changes into it automatically.

### Content automation

The standalone repository `imim2009im-a11y/digital-insight-opus-content-pipeline` is the review-first content/publishing pipeline. It is automation infrastructure, not a public website.

Do not deploy it as a public Railway web service merely because a project named `Digital Insight AI Publisher` exists. First establish a runtime contract, scheduling model, required variables, and publish target.

## Operating protocol

1. Start from `main` unless the task explicitly targets another ref.
2. Use a dedicated branch such as `codex/<short-task-name>` for non-trivial changes.
3. Never force-push or rewrite shared history.
4. Never delete working services, routes, pages, data, or deployment resources without explicit approval and dependency verification.
5. Keep changes focused and reviewable.
6. Inspect relevant Git history/config before editing deployment-sensitive files.
7. Verify production-impacting changes before merge.
8. Summarize files changed, checks run, deployment impact, and remaining risks.

## Non-negotiable product rules

1. Preserve high-quality Arabic and correct RTL behavior where Arabic is used.
2. Do not publish exaggerated income claims, guaranteed results, fake testimonials, or unverified performance claims.
3. Keep affiliate disclosures visible and accurate near commercial content.
4. Never commit API keys, tokens, passwords, cookies, `.env` files, private keys, certificates, database credentials, or other secrets.
5. Preserve the GitHub Pages base path `/digital-insight-ai/` for the static fallback where required.
6. Do not remove `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, or `sitemap.md` without a documented replacement.
7. Validate links and page paths before deployment.
8. Keep pages mobile-usable, keyboard-accessible, and semantically structured.
9. Preserve readable contrast, useful alt text, and visible focus states.
10. Update sitemap/discovery files when public routes change.
11. Do not modify the frozen nested `ai-tools-directory/` snapshot except for an explicitly approved migration/removal task.
12. Do not introduce a new hosting platform or framework without a clear architectural benefit and explicit scope.

## Production boundary rules

### Domain ownership

- `digitalinsightai.com` has exactly one production owner at a time.
- Current owner: Railway `DigitalInsightProduction`.
- Do not recreate a GitHub Pages `CNAME` while Railway owns the domain.
- DNS changes must be made only after the target service is verified healthy.

### Railway

Before changing Railway-related code or config:

1. inspect the current service configuration;
2. preserve `/health/`;
3. preserve database wake/startup behavior unless deliberately replacing it;
4. avoid exposing environment-variable values;
5. verify the Railway fallback URL after deployment.

Do not delete legacy Railway services simply because they are currently failed. First confirm they do not own required volumes, variables, data, domains, or rollback state.

### GitHub Pages

The static site must continue passing `.github/workflows/static-quality.yml`.

The quality gate checks required files, local links/assets, Railway cutover boundaries, and sensitive deployment material. Do not weaken these checks merely to make a failing change pass.

### Vercel / Render

Neither platform is part of the current production path. Do not create duplicate production deployments there unless an explicit migration plan defines ownership, rollback, DNS, and verification.

## Static-site requirements

For modified public static pages/assets:

- confirm all local `href`/`src` targets exist;
- confirm Arabic text and RTL layout remain correct;
- confirm forms retain intended endpoints and validation;
- confirm affiliate disclosure remains clear;
- confirm sitemap/discovery files remain accurate;
- confirm mobile layout and keyboard navigation;
- confirm no secrets or private deployment material were introduced.

Recommended local preview:

```bash
python3 -m http.server 8000
```

## WordPress/Railway requirements

When editing files that affect the Docker/WordPress deployment:

- inspect `Dockerfile`, entrypoint/database-gate files, and deployment configuration together;
- preserve WordPress asset integrity checks unless intentionally replacing the delivery mechanism;
- preserve port/health behavior expected by Railway;
- avoid hard-coding credentials or private service hostnames into tracked files;
- validate that the container can start when MariaDB is sleeping/waking;
- verify both `/health/` and a representative public page after deployment.

## Content standards

- State limitations as clearly as advantages.
- Separate verified facts from opinion, estimates, and future plans.
- Prefer original analysis over vendor-marketing rewrites.
- Use concrete examples and practical recommendations.
- Record real update dates for materially changed reviews/comparisons.
- Verify time-sensitive pricing, features, availability, and model claims before publication.

## SEO and discoverability

When adding or materially changing a public route/page:

- use a unique descriptive title and meta description;
- keep one clear primary heading;
- use canonical metadata deliberately;
- preserve useful Open Graph/social metadata;
- avoid keyword-stuffed navigation;
- update sitemap and machine-readable discovery files where applicable;
- ensure migrations do not create competing canonical origins.

## Security and privacy

- Treat user-submitted form data as private.
- Do not add analytics or third-party collection without documenting privacy impact.
- Avoid inline secrets and private endpoints in client-side code.
- Prefer least-privilege integrations.
- If a task touches authentication, payments, personal data, DNS, deployment credentials, or third-party account access, state the risk before irreversible changes.

## Reliability

Use `scripts/production-smoke.sh` for public endpoint validation. The scheduled `Production Smoke Monitor` workflow checks the canonical domain, Railway production, Railway `/health/`, and the GitHub Pages fallback.

The production smoke workflow is separate from the source quality gate: an outage must be visible without weakening code-quality validation.

## Git and review discipline

- Prefer pull requests for non-trivial changes.
- Do not merge with failing required checks.
- Do not mix unrelated cleanup or dependency work into focused production changes.
- Keep historical branches unless the task explicitly requires cleanup.
- Never force-update `main`.

## Definition of done

A task is complete only when:

1. the requested change is implemented, not merely described;
2. relevant files and infrastructure were inspected for side effects;
3. appropriate checks were run where available;
4. CI/deployment impact is understood;
5. remaining limitations are reported precisely;
6. the final response identifies the branch/commit or PR and changed files.

## Change-control trigger

Any change that moves the canonical domain, production platform, database, or source repository must update `PRODUCTION-ARCHITECTURE.md` in the same change with:

- old owner;
- new owner;
- migration date;
- rollback path;
- verification evidence.

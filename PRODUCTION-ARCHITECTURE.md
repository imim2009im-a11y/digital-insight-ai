# Digital Insight AI — Production Architecture

Last verified: 2026-09-02

## Purpose

This document is the operational source of truth for Digital Insight AI production. It exists to prevent the static GitHub Pages site, the Railway WordPress service, the modern tools application, and the content automation pipeline from being developed as competing products.

## Canonical product

The commercial product is **Digital Insight AI** under the canonical domain:

- `https://digitalinsightai.com/`

The canonical domain is attached to the Railway production service. DNS/SSL availability must be treated as an infrastructure concern, not solved by moving product ownership back to GitHub Pages.

## Production topology

### 1. Railway — primary application runtime

Primary project: **Digital Insight AI WordPress**

Primary service: **DigitalInsightProduction**

Public Railway fallback:

- `https://digitalinsightproduction-production.up.railway.app/`

Service contract:

- HTTP target port: `80`
- Health path: `/health/`
- Health contract: execute PHP and establish a real MariaDB connection; return `200` only when the database is reachable
- Application: WordPress with the Digital Insight AI theme/plugin bundle
- Source repository: `imim2009im-a11y/digital-insight-ai`
- Database: Railway MariaDB

The production service is the only Railway web service that should receive new production traffic unless a migration is explicitly approved.

### 2. GitHub Pages — static fallback/reference surface

Repository:

- `imim2009im-a11y/digital-insight-ai`

Fallback URL:

- `https://imim2009im-a11y.github.io/digital-insight-ai/`

GitHub Pages is retained as a static fallback/reference surface while the WordPress/Railway cutover is completed. It must **not** claim the `digitalinsightai.com` custom domain. The repository quality gate enforces that the `CNAME` file remains absent.

Do not build a second independent editorial product on the GitHub Pages surface. Content and SEO decisions should converge toward the canonical Digital Insight AI product.

### 3. Modern tools application — product module, not a second brand

Repository:

- `imim2009im-a11y/ai-tools-directory`

This repository is the source of truth for the modern AI tools/directory application. It should evolve as a module of Digital Insight AI and should not compete with the main brand or duplicate the static snapshot under `digital-insight-ai/ai-tools-directory/`.

Target integration concept:

- Digital Insight AI `/tools` → modern tools experience
- Digital Insight AI `/compare` → comparison workflows
- Digital Insight AI `/reviews` → commercial review layer

Any production integration must be deliberate and tested. Do not copy files automatically between repositories.

### 4. Content automation — review-first publisher

Repository:

- `imim2009im-a11y/digital-insight-opus-content-pipeline`

Purpose:

- research/content preparation
- review-first publishing workflow
- reusable content assets and distribution automation

This pipeline is **not** the public website. It should publish into the canonical product only after validation and human-review gates. Do not deploy it as a public web service merely because a Railway project named `Digital Insight AI Publisher` exists.

### 5. Digital Insight AI Publisher Railway project

Current role: reserved infrastructure namespace for a future publisher/worker service.

Do not create a public web service here until the publisher repository has a defined runtime contract, start command, health model, required variables, and clear scheduling model. Prefer a worker/cron design if the pipeline is batch-oriented.

## Route ownership target

The long-term public route map is:

| Route | Owner | Purpose |
|---|---|---|
| `/` | WordPress/Railway | Brand home and latest intelligence |
| `/news` | WordPress/Railway | AI news and analysis |
| `/reviews` | WordPress/Railway | Evidence-first tool reviews |
| `/guides` | WordPress/Railway | Practical guides |
| `/lab` | WordPress/Railway | Experiments and test methodology |
| `/tools` | tools application/module | Tool discovery and filtering |
| `/compare` | tools application/module | Comparisons and decision support |
| `/deals` | WordPress/Railway | Transparent affiliate offers |
| `/videos` | WordPress/Railway | YouTube/video content hub |

The exact implementation may change, but route ownership must remain singular: one route, one source of truth.

## Deployment rules

1. **Never attach `digitalinsightai.com` to two hosting platforms at the same time.**
2. Railway owns the canonical production domain during the WordPress cutover.
3. GitHub Pages remains reachable only through its `github.io` fallback URL unless a future migration explicitly reverses this decision.
4. Vercel and Render are not part of the current production path unless a written migration decision adds them.
5. Do not delete legacy Railway services until production dependencies, variables, volumes, and domain ownership are verified.
6. Do not expose secrets in GitHub, logs, documentation, or client-side code.
7. Every production change must preserve `/health/` and pass the repository quality gate.
8. `/health/` must not be a static file-only response; it must validate PHP execution and MariaDB reachability without exposing credentials or connection details.
9. Public URL migrations require canonical, sitemap, robots, Open Graph, and Search Console review.

## Reliability and monitoring

The repository contains `scripts/production-smoke.sh` and a scheduled GitHub Actions workflow that checks:

- canonical domain
- Railway production fallback
- Railway `/health/`
- GitHub Pages fallback

The Railway `/health/` endpoint is database-aware. The request-level database wake gate runs first, then the health endpoint attempts a real MariaDB connection and returns a sanitized `503` response when the database is unavailable. This means Railway deployment health represents the application dependency chain more accurately than an Apache-only static response.

The smoke monitor is intentionally separate from the static quality gate. A production outage should be visible without blocking unrelated source validation.

## Consolidation decisions

### Keep as primary/active

- `digital-insight-ai` — production + static fallback source
- `ai-tools-directory` — modern tools module
- `digital-insight-opus-content-pipeline` — publishing automation

### Evaluate for merge into the primary product

- `digital-insight-ai-pro`
- `affiliate-blog`
- `professional-web-platform`

Do not merge by copying whole repositories. Extract only validated capabilities/content with clear ownership.

### Independent products

Projects such as `baiti-mvp`, `star-arena-ai`, `smart-cv-ai`, `it-asset-manager`, and `b2b-sales-opportunity-manager` are separate products. They should not share Digital Insight AI production infrastructure unless explicitly designed as a shared service.

## Recovery order during an outage

1. Check `DigitalInsightProduction` deployment status.
2. Check Railway `/health/`; a failure now means PHP or MariaDB dependency health is not good enough for production.
3. Check MariaDB availability/wake behavior.
4. Check custom-domain verification, DNS records, and SSL.
5. Check the Railway fallback URL directly.
6. Check GitHub Pages fallback to confirm the static surface remains available.
7. Only change DNS after the target service is verified healthy.
8. Never solve a DNS outage by creating another competing production deployment.

## Change-control rule

Any proposal that changes the canonical domain owner, production platform, database, or source repository must update this document in the same change and state:

- old owner
- new owner
- migration date
- rollback path
- verification evidence

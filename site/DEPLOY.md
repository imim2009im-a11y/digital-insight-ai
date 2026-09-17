# Static production target

This directory is intentionally independent from WordPress, MariaDB, Railway, MongoDB, and server-side runtimes.

## Cloudflare Pages
- Framework preset: None
- Build command: leave empty
- Build output directory: site
- Production branch: main after the pull request is verified
- Custom domain: digitalinsightai.com only after preview validation

## Safety
Do not remove the existing production service until the static preview passes HTTP, link, mobile, SEO, and custom-domain checks.

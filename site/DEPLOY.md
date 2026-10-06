# Static production target

`site/` هو مصدر الموقع العام الإنتاجي، وهو مستقل عن WordPress وMariaDB وRailway وMongoDB.

## Production — GitHub Pages

يتم النشر آليًا عبر `.github/workflows/pages-staging.yml` من الفرع `main`.

- Build command: لا يوجد؛ الموقع ثابت.
- Artifact directory: `site`
- Production branch: `main`
- Pages source: `GitHub Actions`
- Custom domain: `digitalinsightai.com`

## Cutover safety

- لا تعتبر عملية النقل مكتملة قبل أن يعرض رابط GitHub Pages النسخة الموجودة في `site/` بنجاح.
- لا تغيّر DNS إلا إلى سجلات GitHub Pages الرسمية وبعد نجاح فحص GitHub Pages.
- احتفظ بـRailway كمسار رجوع مؤقت فقط حتى نجاح DNS وTLS والمسارات العامة.
- لا تحذف Railway أو MariaDB ضمن هذا التغيير.
- بعد القطع، يجب ألا يعتمد الموقع العام على Railway أو قاعدة بيانات.

## GitHub Pages compatibility — 2026-10-06
- GitHub Pages does **not** implement the Netlify/Cloudflare-style `_headers` or `_redirects` directives. Keep these files for portability/quality gates, but do not claim that they enforce browser security headers or redirects in this hosting environment.
- The legacy `/contact.html` redirect is implemented using an explicit HTML fallback under `site/contact.html`; it is not an HTTP 301 redirect.
- The contact form posts to the previously published Formspree endpoint. A single consented synthetic submission on 2026-10-06 returned Formspree's official success page. Actual inbox delivery remains unverified; avoid claiming mailbox delivery.
- No API keys, databases, runtime processes or third-party JavaScript frameworks are needed for the new static UX.

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

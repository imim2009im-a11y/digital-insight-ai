# Static production target

`site/` هو هدف الإنتاج الجديد للموقع العام، وهو مستقل عن WordPress وMariaDB وRailway وMongoDB.

## Staging — GitHub Pages
يتم النشر آليًا عبر `.github/workflows/pages-staging.yml`.

الهدف: معاينة وفحص النسخة قبل أي تعديل على DNS.

## Production — preferred
Cloudflare Pages هو الهدف المفضل عند توفر اتصال الحساب:

- Framework preset: None
- Build command: فارغ
- Output directory: `site`
- Production branch: `main`
- Custom domain: `digitalinsightai.com` بعد نجاح staging فقط

## Cutover safety
- لا تغيّر DNS قبل نجاح staging.
- لا تضف CNAME للمستودع أثناء staging.
- لا تحذف Railway أو MariaDB قبل نجاح HTTPS والمسارات على الدومين النهائي.
- احتفظ بخطة rollback عبر DNS إلى Railway حتى استقرار النسخة الجديدة.

# Digital Insight Publisher Watchdog

## الهدف

طبقة failover مستقلة عن AppDeploy cron. لا تنسخ أسرار YouTube/Pinterest/TikTok إلى GitHub.

## آلية الثقة

1. GitHub Actions يطلب OIDC token قصير العمر من `token.actions.githubusercontent.com`.
2. الـtoken يحمل audience مخصصًا: `digital-insight-publisher-watchdog`.
3. AppDeploy يتحقق من التوقيع عبر JWKS الرسمي، ثم يتحقق من:
   - repository: `imim2009im-a11y/digital-insight-ai`
   - repository_id: `1260343511`
   - ref: `refs/heads/main`
   - workflow_ref: `.github/workflows/publisher-watchdog.yml@refs/heads/main`
4. إذا كان heartbeat الخاص بـAppDeploy cron أحدث من 8 دقائق، يعيد `primary_healthy` ولا ينفذ أي نشر.
5. إذا كان heartbeat قديمًا، يعالج المهام المستحقة ويعيد `failover_processed`.

## منع النشر المكرر

كل مهمة تدخل حالة `publishing` مع lease لمدة 15 دقيقة. أي مجدول ثانٍ يرى lease صالحًا لا يبدأ رفعًا ثانيًا لنفس المهمة.

## الجدولة

- AppDeploy cron: كل 5 دقائق — المسار الأساسي.
- GitHub Actions: كل 10 دقائق تقريبًا، مع إزاحة 3 دقائق — watchdog فقط.
- تشغيل يدوي متاح عبر `workflow_dispatch`.

## حالات النجاح

وجود workflow أو نجاح build لا يعني أن النشر الاجتماعي مُثبت. الحالة النهائية لا تصبح `publishing verified` إلا بعد نجاح اختبار OAuth ونشر حقيقي محدود على المنصة المقصودة.

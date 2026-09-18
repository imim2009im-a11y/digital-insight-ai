# Digital Insight AI — Production Architecture

Last verified: 2026-09-18

## القرار المعماري

المنتج التجاري هو **Digital Insight AI** تحت الدومين:

- `https://digitalinsightai.com/`

تم تغيير الهدف الإنتاجي من WordPress/Railway إلى **GitHub Pages** لموقع ثابت مصدره `site/`.

السبب: الصفحات العامة لا تحتاج PHP أو MariaDB لكي تعمل، وربطها بخادم وقاعدة بيانات مدفوعة خلق تكلفة وتعقيدًا ونقاط توقف غير ضرورية.

## الحالة الانتقالية

قرار 2026-09-18 هو جعل GitHub Pages مالك الاستضافة العامة الوحيد، مع إبقاء Railway كمسار رجوع مؤقت فقط أثناء القطع.

- المالك السابق: Railway `DigitalInsightProduction`.
- المالك المستهدف: GitHub Pages للمستودع `imim2009im-a11y/digital-insight-ai`.
- دليل DNS عند الفحص: سجل A للجذر ما زال يشير إلى `69.46.46.103`، لذلك القطع لم يكتمل بعد.
- رابط GitHub Pages الافتراضي يستجيب، لكن يجب أن يعرض artifact من `site/` عبر GitHub Actions قبل تحويل DNS.
- لا تُحذف MariaDB أو خدمات Railway ضمن هذا التغيير.
- لا يُعلن نجاح النقل قبل نجاح HTTPS على `digitalinsightai.com` وتحميل المسارات والأصول من GitHub Pages.

## مصدر الحقيقة

### الموقع العام
Repository: `imim2009im-a11y/digital-insight-ai`

Source directory:

- `site/`

يحتوي على HTML/CSS/JS وSEO وrobots وsitemap وheaders وredirects، ولا يعتمد على قاعدة بيانات أو runtime خادمي.

### الأدوات الحديثة
Repository: `imim2009im-a11y/ai-tools-directory`

يبقى مصدر تطوير تجربة دليل الأدوات المتقدمة، ويتم دمج القدرات إلى المنتج الرئيسي بشكل مقصود وليس كعلامة منفصلة.

### أتمتة المحتوى
Repository: `imim2009im-a11y/digital-insight-opus-content-pipeline`

عامل إعداد ومراجعة محتوى، وليس موقعًا عامًا مستقلًا.

## الاستضافة

### Production target
GitHub Pages هو هدف الإنتاج للموقع العام الثابت. يتم نشر `site/` عبر GitHub Actions دون خادم تطبيق أو قاعدة بيانات.

GitHub repository هو مصدر الحقيقة، وGitHub Pages هو طبقة التقديم العامة المستهدفة.

## Route ownership

| Route | Source |
|---|---|
| `/` | `site/index.html` |
| `/tools/` | `site/tools/index.html` |
| `/reviews/` | `site/reviews/index.html` |
| `/guides/` | `site/guides/index.html` |
| `/about/` | `site/about/index.html` |
| `/privacy/` | `site/privacy/index.html` |

الروابط القديمة تُحوّل عبر `site/_redirects`.

## قواعد القطع

1. لا تربط `digitalinsightai.com` بمنصتين إنتاجيتين في الوقت نفسه.
2. لا تغيّر DNS قبل أن تكون نسخة staging ناجحة.
3. اختبر HTTP وHTTPS والمسارات و404 وrobots وsitemap قبل القطع.
4. حافظ على canonical للدومين الأساسي.
5. لا تضف قاعدة بيانات إلى الموقع العام إلا إذا ظهرت حاجة وظيفية حقيقية.
6. أي وظائف مستقبلية ديناميكية تكون منفصلة وصغيرة ولا تجعل الصفحة العامة تعتمد عليها.
7. لا تعرض الأسرار في العميل أو المستودع أو السجلات.
8. لا تحذف Railway/DB قبل انتهاء نافذة الرجوع.

## Verification evidence

في 2026-09-17:

- تم إنشاء `site/` كنسخة ثابتة جديدة.
- نجح `Static Rebuild Check`.
- نجح `Static Site Quality Gate`.
- نجح `Agent Governance Verification`.
- PR #44 دُمج إلى `main` بعد نجاح الفحوص.

في 2026-09-18:

- الفحص العام لـ`digitalinsightai.com` أعاد صفحة Railway 404.
- DNS الجذر ما زال `69.46.46.103`.
- لا يوجد CNAME عام لـ`www.digitalinsightai.com`.
- رابط GitHub Pages الافتراضي يستجيب HTTP 200 لكنه يعرض السطح القديم، لذلك مصدر Pages الحالي يحتاج التحويل إلى GitHub Actions قبل قطع DNS.

## Cutover sequence

1. نشر `site/` مباشرة عبر GitHub Pages Actions.
2. التحقق من رابط Pages الافتراضي والمسارات والأصول.
3. تفعيل `digitalinsightai.com` كـCustom Domain في GitHub Pages.
4. نقل DNS من Railway إلى سجلات GitHub Pages الرسمية.
5. التحقق من TLS للدومين.
6. اختبار `/`, `/tools/`, `/reviews/`, `/guides/`, `/robots.txt`, `/sitemap.xml`.
7. مراقبة الاستقرار.
8. بعد نجاح نافذة الرجوع، يمكن إيقاف موارد Railway غير اللازمة في تغيير منفصل.

## Rollback

إذا فشل القطع النهائي:

1. لا تحذف أي بيانات.
2. أعد DNS إلى هدف Railway السابق.
3. تحقق من `DigitalInsightProduction` وMariaDB.
4. أصلح static target خارج مسار الإنتاج.
5. أعد محاولة القطع بعد نجاح staging.

هذا يجعل الرجوع قرار DNS فقط بدل إعادة بناء المشروع أثناء العطل.

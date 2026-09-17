# Digital Insight AI — Production Architecture

Last verified: 2026-09-17

## القرار المعماري

المنتج التجاري هو **Digital Insight AI** تحت الدومين:

- `https://digitalinsightai.com/`

تم تغيير الهدف الإنتاجي من WordPress/Railway إلى **موقع ثابت host-agnostic** مصدره `site/`.

السبب: الصفحات العامة لا تحتاج PHP أو MariaDB لكي تعمل، وربطها بخادم وقاعدة بيانات مدفوعة خلق تكلفة وتعقيدًا ونقاط توقف غير ضرورية.

## الحالة الانتقالية

حتى اكتمال قطع DNS:

- `DigitalInsightProduction` على Railway يبقى **legacy/rollback**.
- الدومين قد يظل متصلًا بـRailway مؤقتًا أثناء تجهيز واختبار البديل.
- لا تُحذف MariaDB أو الخدمات القديمة قبل التحقق من النسخة الثابتة وحفظ مسار الرجوع.
- GitHub Pages يستخدم staging فقط ولا يصبح مالك الدومين تلقائيًا.

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

### Staging
GitHub Pages يستخدم لمعاينة النسخة الثابتة واختبارها بدون تغيير DNS.

### Production target
الهدف هو استضافة static/CDN مجانية أو منخفضة التكلفة لا تتطلب runtime دائمًا. **Cloudflare Pages هو الخيار المفضل للقطع النهائي** عند توفر الاتصال بالحساب، مع بقاء ملفات `site/` قابلة للنقل إلى أي static host آخر.

الاستضافة ليست مصدر الحقيقة؛ GitHub هو مصدر الحقيقة.

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

## Cutover sequence

1. نشر `site/` على staging.
2. تنفيذ smoke checks على staging.
3. مراجعة التصميم على الهاتف وسطح المكتب.
4. تجهيز static production host.
5. نقل DNS من Railway إلى المضيف الجديد مرة واحدة.
6. التحقق من TLS للدومين.
7. اختبار `/`, `/tools/`, `/reviews/`, `/guides/`, `/robots.txt`, `/sitemap.xml`.
8. مراقبة الاستقرار.
9. بعد نجاح النافذة، إيقاف موارد Railway المدفوعة غير اللازمة.

## Rollback

إذا فشل القطع النهائي:

1. لا تحذف أي بيانات.
2. أعد DNS إلى هدف Railway السابق.
3. تحقق من `DigitalInsightProduction` وMariaDB.
4. أصلح static target خارج مسار الإنتاج.
5. أعد محاولة القطع بعد نجاح staging.

هذا يجعل الرجوع قرار DNS فقط بدل إعادة بناء المشروع أثناء العطل.

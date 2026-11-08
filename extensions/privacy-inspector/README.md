# Digital Insight Privacy Inspector — تجريبي / غير منشور

إضافة عربية مستقلة لمتصفحات Chromium/Brave، مع واجهة RTL وManifest V3. لا تُشغَّل تلقائيًا؛ يبدأ التحليل عندما ينقر المستخدم على زر الفحص داخل النافذة المنبثقة.

## نطاق الإصدار 0.1.0

- يتحقق من بروتوكول HTTPS للصفحة الحالية، وعدد موارد JavaScript والإطارات ذات **الأصول المختلفة**، وعدد نماذج HTTP، والروابط التي تفتح نافذة جديدة دون `noopener`/`noreferrer` صريح.
- استخدام `activeTab` و`scripting` فقط؛ لا `host_permissions` شاملة، ولا محتوى دائم، ولا أحداث مراقبة، ولا وصول للكوكيز أو السجل، ولا خدمة خلفية، ولا أدوات تحليل أو اتصالات API.
- يتم حساب مؤشرات مجمّعة داخل الصفحة وترجع إلى نافذة الإضافة؛ لا تنتقل النتائج إلى Digital Insight AI أو أي خادم. النسخ يدوي ويشمل أرقامًا فقط.
- الرابط إلى سياسة الخصوصية لموقع Digital Insight AI رابط خارجي اختياري يفتحه المستخدم يدويًا؛ **ليس** تكاملًا لنقل المعلومات أو حسابًا موحدًا.
- لا تقرأ الإضافة أسماء أو قيم الحقول ولا نص الصفحة ولا العنوان أو الرابط ضمن التقرير. تتحقق النافذة فقط من أن URL في التبويب HTTP(S) قبل طلب الفحص.
- حد 5000 عنصر لكل فئة لمنع استنزاف الوقت، وتعرض رسالة عندما يكون الفحص جزئيًا.

## القيود المهمة

لا يمثل عدد الموارد ذات الأصول المختلفة دليلاً على أنها أدوات تتبع؛ وقد تكون أصول CDN مشروعة. لا تكشف الإضافة رؤوس HTTP الأمنية (ومنها CSP وHSTS)، أو طلبات الشبكة الفعلية والمحجوبة، أو الكوكيز أو localStorage، أو محتوى iframes المعزولة، أو مشاكل الخادم وAuth/RLS. كذلك قد ينطبق عزل `noopener` ضمنيًا على روابط `target=_blank` في متصفحات حديثة؛ يعدّ غياب التصريح هنا ملاحظة تنظيف لا ثغرة مؤكدة. هذا **فحص معلوماتي أولي، وليس تدقيقًا أمنيًا كاملاً**.

## التثبيت محليًا للاختبار فقط

1. افتح `brave://extensions` أو `chrome://extensions`.
2. فعّل **Developer mode**.
3. اختر **Load unpacked** وحدد مجلد `extensions/privacy-inspector` الذي يحتوي على `manifest.json` مباشرة.
4. افتح موقع HTTPS عاديًا، واضغط رمز الإضافة ثم **افحص الصفحة الحالية**.
5. راقب المؤشرات، وجرّب صفحة HTTP أو صفحة `chrome://` للتأكد من ظهور القيود الصحيحة.

## اختبارات دون اعتماديات

من جذر المستودع:

```bash
node --check extensions/privacy-inspector/scan.js
node --check extensions/privacy-inspector/popup.js
node --test extensions/privacy-inspector/test/*.test.cjs
```

التثبيت اليدوي لا يعني الاعتماد أو النشر في متاجر المتصفحات، ولا يتطلب حسابًا مدفوعًا. لم تُضف أي تعديلات داخل `site/` ولا DNS أو Railway أو Chromium/Brave Core. قبل التوزيع العام يلزم اختبار متصفحات حقيقي، ومراجعة تجربة المستخدم، وإفصاح ملائم وسياسة خصوصية خاصة بالإضافة إن كانت مطلوبة.

## مراجع

- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-activetab
- https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy
- https://github.com/brave/brave-core/blob/master/README.md

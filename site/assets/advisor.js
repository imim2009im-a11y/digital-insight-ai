/* Deterministic, evidence-aware advisor over the published local catalog.
 * No AI API, paid services, cookies, tracking, or submission of user answers.
 */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const form = byId('advisor-form');
  const status = byId('advisor-status');
  const results = byId('advisor-results');
  if (!form || !status || !results) return;

  const create = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const validId = (id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  const validReview = (href) => typeof href === 'string' && /^\.\.\/reviews\/[a-z0-9-]+\/$/.test(href);

  async function loadCatalog() {
    try {
      const response = await fetch('../data/tools.json', { credentials: 'omit', mode: 'same-origin' });
      if (!response.ok) throw Error('catalog unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.tools) || data.tools.length === 0) {
        throw Error('catalog schema mismatch');
      }
      const all = data.tools;
      if (all.some((item) => !validId(item.id) || typeof item.name !== 'string'
        || typeof item.focus !== 'string' || typeof item.category !== 'string')) {
        throw Error('invalid catalog entry');
      }
      form.hidden = false;
      status.textContent = 'اختر المهمة وأجب عن الأسئلة لعرض خيارات أولية بحسب المعلومات المنشورة. لا تُرسل الإجابات إلى خادم.';

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const task = byId('advisor-task').value;
        const audience = byId('advisor-audience').value;
        const budget = byId('advisor-budget').value;
        const arabic = byId('advisor-arabic').checked;
        const privacy = byId('advisor-privacy').checked;
        const matching = all.filter((tool) => tool.category === task)
          .sort((a, b) => {
            const score = (tool) => (
              (budget === 'free' && tool.facts?.freePlan?.available === true ? 2 : 0)
              + (arabic && tool.facts?.arabicVideoTranslation?.available === true ? 1 : 0)
            );
            return score(b) - score(a) || a.name.localeCompare(b.name, 'ar');
          });
        results.replaceChildren();
        if (!matching.length) {
          status.textContent = 'لا توجد أدوات منشورة في هذا التصنيف. اختر مهمة أخرى أو تصفح الدليل.';
          return;
        }

        status.textContent = matching.length + (matching.length === 1 ? ' أداة أولية مطابقة للتصنيف. ' : ' أدوات أولية مطابقة للتصنيف. ')
          + 'عند اختيار شروط إضافية، تظهر الحقائق الموثقة أولًا ثم البقية للمراجعة؛ ليست النتائج تقييمًا للجودة.';
        const caveats = ['المطابقة حسب تصنيف المهمة المنشور فقط، وليست إثباتًا لجودة الأداة أو ملاءمتها النهائية.'];
        if (budget === 'free') caveats.push('بعض الخطط المجانية موثقة بمصادر رسمية؛ لا يثبت ذلك أن كل ميزة متاحة مجانًا، والأدوات الأخرى تحتاج تحققًا.');
        else if (budget !== 'unknown') caveats.push('الأسعار بالريال السعودي غير موثقة؛ لا يمكن تأكيد مطابقة ميزانيتك.');
        if (arabic) caveats.push('توثيق ترجمة الفيديو للعربية متاح لبعض الأدوات فقط؛ ولا يثبت جودة العربية أو إتاحتها في الخطة المجانية. دعم بقية الأدوات يحتاج تحققًا.');
        if (privacy) caveats.push('متطلبات الخصوصية وحماية البيانات غير موثقة؛ يلزم فحص شروط المزود قبل مشاركة بيانات العمل.');
        if (audience === 'business') caveats.push('الاستخدام المؤسسي يحتاج مراجعة الترخيص والتكامل وسياسات البيانات لدى المزود.');
        const summary = create('p', caveats.join(' '), 'advisor-disclaimer');
        results.append(summary);

        const list = create('div', undefined, 'advisor-options');
        matching.forEach((tool) => {
          const article = create('article', undefined, 'advisor-option');
          const heading = create('h3');
          const link = create('a', tool.name);
          link.href = '#tool-' + tool.id;
          heading.append(link);
          article.append(heading);
          article.append(create('p', 'الاستخدام المذكور في الدليل: ' + tool.focus));
          if (budget !== 'unknown') {
            const free = tool.facts?.freePlan;
            article.append(create('p', free?.available === true
              ? 'خطة مجانية مثبتة بمصدر رسمي: ' + free.scope + ' (راجع المصدر بالبطاقة).'
              : 'توفر خطة مجانية غير موثق لهذا الخيار.', 'advisor-fact'));
          }
          if (arabic) {
            const translation = tool.facts?.arabicVideoTranslation;
            article.append(create('p', translation?.available === true
              ? 'تتوفر ترجمة فيديو بالعربية وفق المصدر الرسمي: ' + translation.scope
              : 'لم يُتحقق من دعم العربية للميزة المطلوبة.', 'advisor-fact'));
          }
          if (tool.review && validReview(tool.review.href)) {
            const review = create('a', 'اقرأ المراجعة المنشورة');
            review.href = tool.review.href;
            article.append(review);
          } else {
            article.append(create('p', 'لا توجد مراجعة تفصيلية منشورة في الدليل حتى الآن.', 'advisor-unknown'));
          }
          list.append(article);
        });
        results.append(list);
      });
    } catch (_) {
      form.hidden = true;
      results.replaceChildren();
      status.textContent = 'تعذر تحميل بيانات الأدوات. استخدم البحث والمقارنة أعلاه؛ لن نعرض توصيات دون بيانات.';
    }
  }
  loadCatalog();
})();

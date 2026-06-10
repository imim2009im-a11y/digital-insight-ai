(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CLICK_STORAGE_KEY = 'digitalInsightAffiliateClicks';
  const LEAD_STORAGE_KEY = 'digitalInsightNewsletterLead';

  function setStatus(form, message, type) {
    const status = form.querySelector('.form-status');
    if (!status) return;
    status.textContent = message;
    status.className = 'form-status ' + (type || '');
  }

  function value(form, name) {
    const field = form.elements[name];
    return field ? String(field.value || '').trim() : '';
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // التخزين المحلي اختياري.
    }
  }

  async function submitToEndpoint(form, payload) {
    const endpoint = String(form.dataset.endpoint || '').trim();
    if (!endpoint || endpoint.includes('REPLACE_WITH')) return false;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: payload
    });

    if (!response.ok) throw new Error('form-submit-failed');
    return true;
  }

  function addUtmParams(link) {
    try {
      const url = new URL(link.href);
      if (!url.hostname.includes('gamsgo.com')) return;
      url.searchParams.set('utm_source', 'digital_insight_ai');
      url.searchParams.set('utm_medium', 'affiliate');
      url.searchParams.set('utm_campaign', 'tools_directory');
      if (link.dataset.tool) url.searchParams.set('utm_content', link.dataset.tool);
      link.href = url.toString();
    } catch (error) {
      // تجاهل الروابط غير الصالحة.
    }
  }

  function trackAffiliateClick(link) {
    const record = {
      tool: link.dataset.tool || link.textContent.trim() || 'unknown',
      url: link.href,
      page: location.pathname.split('/').pop() || 'index.html',
      at: new Date().toISOString()
    };

    const clicks = readJson(CLICK_STORAGE_KEY, []);
    clicks.push(record);
    writeJson(CLICK_STORAGE_KEY, clicks.slice(-250));

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_click', {
        tool_name: record.tool,
        link_url: record.url,
        page_path: location.pathname
      });
    }
  }

  document.querySelectorAll('.js-newsletter').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = value(form, 'name');
      const email = value(form, 'email');

      if (!EMAIL_RE.test(email)) {
        setStatus(form, 'اكتب بريداً إلكترونياً صحيحاً أولاً.', 'error');
        return;
      }

      const payload = new FormData(form);
      payload.set('source', 'newsletter');
      payload.set('site', 'Digital Insight AI');

      try {
        const sent = await submitToEndpoint(form, payload);
        writeJson(LEAD_STORAGE_KEY, { name, email, savedAt: new Date().toISOString(), sent });
        form.reset();
        setStatus(form, sent ? 'تم إرسال طلب الاشتراك بنجاح.' : 'تم تسجيل الطلب محلياً في النسخة التجريبية. أضف رابط Formspree لتفعيل الإرسال الحقيقي.', 'success');
      } catch (error) {
        setStatus(form, 'تعذّر إرسال الطلب. راجع رابط خدمة النماذج أو جرّب لاحقاً.', 'error');
      }
    });
  });

  document.querySelectorAll('.js-contact').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = value(form, 'name');
      const email = value(form, 'email');
      const message = value(form, 'message');

      if (!name || !EMAIL_RE.test(email) || message.length < 10) {
        setStatus(form, 'أكمل الاسم والبريد، واكتب رسالة واضحة لا تقل عن 10 أحرف.', 'error');
        return;
      }

      const payload = new FormData(form);
      payload.set('source', 'contact');
      payload.set('site', 'Digital Insight AI');

      try {
        const sent = await submitToEndpoint(form, payload);
        if (sent) {
          form.reset();
          setStatus(form, 'تم إرسال الرسالة بنجاح.', 'success');
          return;
        }

        const text = 'رسالة من Digital Insight AI\n\nالاسم: ' + name + '\nالبريد: ' + email + '\n\nالرسالة:\n' + message;
        await navigator.clipboard.writeText(text);
        setStatus(form, 'تم تجهيز الرسالة ونسخها. أضف رابط Formspree لاحقاً لتفعيل الإرسال الحقيقي.', 'success');
      } catch (error) {
        setStatus(form, 'تعذّر إرسال الرسالة أو نسخها. راجع إعداد خدمة النماذج.', 'error');
      }
    });
  });

  document.querySelectorAll('a[rel~="sponsored"], .js-affiliate-link').forEach((link) => {
    addUtmParams(link);
    link.addEventListener('click', () => trackAffiliateClick(link));
  });

  if (document.body.dataset.page === 'analytics') {
    const clicks = readJson(CLICK_STORAGE_KEY, []);
    const tbody = document.querySelector('[data-click-table]');
    const total = document.querySelector('[data-click-total]');

    if (total) total.textContent = String(clicks.length);
    if (tbody) {
      if (!clicks.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'لا توجد نقرات مسجلة في هذا المتصفح بعد.';
        row.appendChild(cell);
        tbody.appendChild(row);
      } else {
        clicks.slice().reverse().forEach((click) => {
          const row = document.createElement('tr');
          ['tool', 'page', 'at'].forEach((key) => {
            const cell = document.createElement('td');
            cell.textContent = key === 'at' ? new Date(click.at).toLocaleString('ar-SA') : String(click[key] || '');
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
      }
    }
  }
})();

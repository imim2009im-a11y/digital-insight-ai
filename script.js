(function () {
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CLICK_KEY = 'digitalInsightAffiliateClicks';
  const MAX_CLICKS = 250;

  function status(form, text, type) {
    const node = form.querySelector('.form-status');
    if (!node) return;
    node.textContent = text;
    node.className = 'form-status ' + (type || '');
  }

  function field(form, name) {
    return form.elements[name] ? String(form.elements[name].value || '').trim() : '';
  }

  function readClicks() {
    try {
      const value = JSON.parse(localStorage.getItem(CLICK_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveClicks(value) {
    try {
      localStorage.setItem(CLICK_KEY, JSON.stringify(value.slice(-MAX_CLICKS)));
    } catch (error) {
      // التخزين المحلي اختياري.
    }
  }

  function normalizeClick(click) {
    const rawDate = click && (click.at || click.ts);
    const date = rawDate ? new Date(rawDate) : null;
    return {
      tool: String((click && click.tool) || 'unknown'),
      url: String((click && click.url) || ''),
      page: String((click && click.page) || '').split('/').filter(Boolean).pop() || 'index.html',
      at: date && !Number.isNaN(date.getTime()) ? date.toISOString() : ''
    };
  }

  async function submit(form, payload) {
    const endpoint = String(form.dataset.endpoint || '').trim();
    if (!endpoint || endpoint.includes('REPLACE_WITH')) throw new Error('missing-endpoint');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload,
        signal: controller.signal
      });
      if (!response.ok) throw new Error('submit-failed');
    } finally {
      clearTimeout(timer);
    }
  }

  function busy(form, value) {
    const button = form.querySelector('button[type="submit"]');
    form.setAttribute('aria-busy', value ? 'true' : 'false');
    if (button) button.disabled = value;
  }

  document.querySelectorAll('.js-newsletter').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;
      const email = field(form, 'email');
      if (!EMAIL_RE.test(email)) {
        status(form, 'اكتب بريداً إلكترونياً صحيحاً أولاً.', 'error');
        return;
      }

      const payload = new FormData(form);
      payload.set('source', payload.get('source') || 'newsletter');
      payload.set('site', 'Digital Insight AI');
      busy(form, true);
      try {
        await submit(form, payload);
        form.reset();
        status(form, 'تم إرسال طلب الاشتراك بنجاح.', 'success');
      } catch (error) {
        status(form, error.name === 'AbortError' ? 'انتهت مهلة الإرسال. حاول مرة أخرى.' : 'تعذّر إرسال الطلب. جرّب لاحقاً.', 'error');
      } finally {
        busy(form, false);
      }
    });
  });

  document.querySelectorAll('.js-contact').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;
      const name = field(form, 'name');
      const email = field(form, 'email');
      const message = field(form, 'message');
      if (!name || !EMAIL_RE.test(email) || message.length < 10) {
        status(form, 'أكمل الاسم والبريد، واكتب رسالة واضحة لا تقل عن 10 أحرف.', 'error');
        return;
      }

      const payload = new FormData(form);
      payload.set('source', 'contact');
      payload.set('site', 'Digital Insight AI');
      busy(form, true);
      try {
        await submit(form, payload);
        form.reset();
        status(form, 'تم إرسال الرسالة بنجاح.', 'success');
      } catch (error) {
        status(form, error.name === 'AbortError' ? 'انتهت مهلة الإرسال. حاول مرة أخرى.' : 'تعذّر إرسال الرسالة. جرّب لاحقاً.', 'error');
      } finally {
        busy(form, false);
      }
    });
  });

  function addCampaign(link) {
    try {
      const url = new URL(link.href, document.baseURI);
      if (!url.hostname.includes('gamsgo.com')) return;
      url.searchParams.set('utm_source', 'digital_insight_ai');
      url.searchParams.set('utm_medium', 'affiliate');
      url.searchParams.set('utm_campaign', link.closest('#recommendations') ? 'start_tool_finder' : 'tools_directory');
      if (link.dataset.tool) url.searchParams.set('utm_content', link.dataset.tool.toLowerCase().replace(/\s+/g, '-'));
      link.href = url.toString();
    } catch (error) {
      // تجاهل الرابط غير الصالح.
    }
  }

  function track(link) {
    const record = {
      tool: link.dataset.tool || link.textContent.trim() || 'unknown',
      url: link.href,
      page: location.pathname.split('/').filter(Boolean).pop() || 'index.html',
      at: new Date().toISOString()
    };
    const clicks = readClicks().map(normalizeClick).filter((item) => item.at);
    const last = clicks[clicks.length - 1];
    const duplicate = last && last.tool === record.tool && last.url === record.url && Date.parse(record.at) - Date.parse(last.at) < 1500;
    if (!duplicate) {
      clicks.push(record);
      saveClicks(clicks);
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_click', { tool_name: record.tool, link_url: record.url, page_path: location.pathname });
    }
  }

  document.querySelectorAll('a[rel~="sponsored"], .js-affiliate-link').forEach(addCampaign);
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[rel~="sponsored"], .js-affiliate-link');
    if (!link) return;
    addCampaign(link);
    track(link);
  });

  if (document.body.dataset.page === 'start') {
    const shortUrl = new URL('go/', document.baseURI).href;
    const image = document.querySelector('.qr-box img');
    const label = document.querySelector('.short-link');
    if (image) image.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(shortUrl);
    if (label) {
      label.textContent = 'digital-insight-ai/go/';
      label.title = shortUrl;
    }
  }

  if (document.body.dataset.page === 'analytics') {
    const clicks = readClicks().map(normalizeClick).filter((item) => item.at);
    const tbody = document.querySelector('[data-click-table]');
    const total = document.querySelector('[data-click-total]');
    if (total) total.textContent = String(clicks.length);
    if (tbody) {
      tbody.textContent = '';
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
          [click.tool, click.page, new Date(click.at).toLocaleString('ar-SA')].forEach((text) => {
            const cell = document.createElement('td');
            cell.textContent = text;
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
      }
    }
  }
})();

(function () {
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CLICK_KEY = 'digitalInsightAffiliateClicks';
  const MAX_CLICKS = 250;

  function emitEvent(name, params) {
    const payload = Object.assign({ page_path: location.pathname }, params || {});
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: name }, payload));
    }
  }

  window.digitalInsightTrack = emitEvent;

  function status(form, text, type) {
    const node = form.querySelector('.form-status');
    if (!node) return;
    node.textContent = text;
    node.className = 'form-status ' + (type || '');
  }

  function field(form, name) {
    return form.elements[name] ? String(form.elements[name].value || '').trim() : '';
  }

  function requireConsent(form) {
    const checkbox = form.querySelector('input[name="privacy_consent"]');
    if (checkbox && checkbox.checked) {
      checkbox.removeAttribute('aria-invalid');
      return true;
    }
    if (checkbox) {
      checkbox.setAttribute('aria-invalid', 'true');
      checkbox.focus();
    }
    status(form, 'يلزم الموافقة على سياسة الخصوصية قبل الإرسال.', 'error');
    return false;
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
      source: String((click && click.source) || ''),
      campaign: String((click && click.campaign) || ''),
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
      if (!requireConsent(form)) return;
      const email = field(form, 'email');
      if (!EMAIL_RE.test(email)) {
        status(form, 'اكتب بريداً إلكترونياً صحيحاً أولاً.', 'error');
        return;
      }

      const source = field(form, 'source') || 'newsletter';
      const formName = field(form, 'form_name') || 'newsletter';
      const payload = new FormData(form);
      payload.set('source', source);
      payload.set('site', 'Digital Insight AI');
      busy(form, true);
      try {
        await submit(form, payload);
        form.reset();
        status(form, 'تم إرسال طلب الاشتراك بنجاح.', 'success');
        emitEvent('newsletter_submit', { form_name: formName, source_name: source });
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
      if (!requireConsent(form)) return;
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
        emitEvent('contact_submit', { form_name: 'contact' });
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
    const pageParams = new URLSearchParams(location.search);
    const record = {
      tool: link.dataset.tool || link.textContent.trim() || 'unknown',
      url: link.href,
      page: location.pathname.split('/').filter(Boolean).pop() || 'index.html',
      source: pageParams.get('utm_source') || 'direct',
      campaign: pageParams.get('utm_campaign') || '',
      at: new Date().toISOString()
    };
    const clicks = readClicks().map(normalizeClick).filter((item) => item.at);
    const duplicate = clicks.some((item) =>
      item.tool === record.tool &&
      item.url === record.url &&
      Math.abs(Date.parse(record.at) - Date.parse(item.at)) < 1500
    );
    if (!duplicate) {
      clicks.push(record);
      saveClicks(clicks);
      emitEvent('affiliate_click', {
        tool_name: record.tool,
        link_url: record.url,
        traffic_source: record.source,
        campaign_name: record.campaign
      });
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

  function setupRoiCalculator() {
    const calculator = document.querySelector('[data-roi-calculator]');
    if (!calculator) return;

    const inputs = Object.fromEntries(
      Array.from(calculator.querySelectorAll('[data-roi-input]')).map((input) => [input.dataset.roiInput, input])
    );
    const calculate = calculator.querySelector('[data-roi-calculate]');
    const results = calculator.querySelector('[data-roi-results]');
    const error = calculator.querySelector('[data-roi-error]');
    const verdict = calculator.querySelector('[data-roi-verdict]');
    const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });
    const decimal = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 1 });

    function valueOf(name) {
      return Number.parseFloat(inputs[name] ? inputs[name].value : '');
    }

    function valid(values) {
      return Object.values(values).every((value) => Number.isFinite(value) && value > 0) &&
        values.cost <= 1000000 && values.hourly <= 1000000 && values.minutes <= 1440 && values.uses <= 10000;
    }

    function inputIsValid(name, value) {
      const maximums = { cost: 1000000, hourly: 1000000, minutes: 1440, uses: 10000 };
      return Number.isFinite(value) && value > 0 && value <= maximums[name];
    }

    function setText(selector, value) {
      const node = calculator.querySelector(selector);
      if (node) node.textContent = value;
    }

    function render() {
      const values = {
        cost: valueOf('cost'),
        hourly: valueOf('hourly'),
        minutes: valueOf('minutes'),
        uses: valueOf('uses')
      };

      if (!valid(values)) {
        error.hidden = false;
        results.hidden = true;
        Object.entries(inputs).forEach(([name, input]) => {
          const inputValue = Number.parseFloat(input.value);
          input.toggleAttribute('aria-invalid', !inputIsValid(name, inputValue));
        });
        return;
      }

      Object.values(inputs).forEach((input) => input.removeAttribute('aria-invalid'));
      error.hidden = true;

      const savedHours = values.minutes * values.uses / 60;
      const timeValue = savedHours * values.hourly;
      const netValue = timeValue - values.cost;
      const breakEvenUses = values.cost / (values.hourly * values.minutes / 60);
      let verdictText = 'غير مجدية بالأرقام الحالية';
      let guidance = 'اختبر أداة أرخص، ارفع عدد المهام الحقيقية، أو ألغِ الاشتراك حتى يظهر استخدام متكرر يبرر التكلفة.';
      let verdictClass = 'is-caution';
      let outcome = 'negative';

      if (netValue > 0 && timeValue >= values.cost * 2) {
        verdictText = 'واعدة — اختبر الجودة قبل الاشتراك';
        guidance = 'الأرقام تبدو واعدة، لكن القرار النهائي يعتمد على ثبات الجودة، وقت المراجعة، والخصوصية. اختبر المهمة نفسها ثلاث مرات أولاً.';
        verdictClass = 'is-positive';
        outcome = 'strong';
      } else if (netValue > 0) {
        verdictText = 'قد تكون مجدية بعد اختبار عملي';
        guidance = 'الهامش محدود؛ ابدأ بأقصر خطة متاحة وسجّل الوقت الفعلي الموفر قبل التجديد.';
        verdictClass = 'is-positive';
        outcome = 'marginal';
      }

      verdict.classList.remove('is-positive', 'is-caution');
      verdict.classList.add(verdictClass);
      setText('[data-roi-verdict-text]', verdictText);
      setText('[data-roi-time]', decimal.format(savedHours));
      setText('[data-roi-value]', money.format(timeValue));
      setText('[data-roi-net]', (netValue < 0 ? '−' : '+') + money.format(Math.abs(netValue)));
      setText('[data-roi-break-even]', decimal.format(Math.ceil(breakEvenUses * 10) / 10));
      setText('[data-roi-guidance]', guidance);
      results.hidden = false;
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      emitEvent('roi_calculator_complete', { outcome_bucket: outcome });
    }

    if (calculate) calculate.addEventListener('click', render);
    Object.values(inputs).forEach((input) => input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') render();
    }));
  }

  setupRoiCalculator();

  if (document.body.dataset.page === 'start') {
    const shortUrl = new URL('go/', document.baseURI).href;
    const image = document.querySelector('.qr-box img');
    const label = document.querySelector('.short-link');
    if (image) image.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(shortUrl);
    if (label) {
      label.textContent = 'digitalinsightai.com/go/';
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
        clicks.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).forEach((click) => {
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

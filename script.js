(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  document.querySelectorAll('.js-newsletter').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = value(form, 'name');
      const email = value(form, 'email');

      if (!EMAIL_RE.test(email)) {
        setStatus(form, 'اكتب بريداً إلكترونياً صحيحاً أولاً.', 'error');
        return;
      }

      try {
        localStorage.setItem('digitalInsightNewsletterLead', JSON.stringify({ name, email, savedAt: new Date().toISOString() }));
      } catch (error) {
        // التخزين المحلي ليس ضرورياً لعمل الصفحة.
      }

      form.reset();
      setStatus(form, 'تم تسجيل الطلب محلياً في النسخة التجريبية. اربطه بخدمة بريدية قبل الإطلاق التجاري.', 'success');
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

      const text = `رسالة من Digital Insight AI\n\nالاسم: ${name}\nالبريد: ${email}\n\nالرسالة:\n${message}`;

      try {
        await navigator.clipboard.writeText(text);
        setStatus(form, 'تم تجهيز الرسالة ونسخها. الصقها في بريدك لإرسالها عند تفعيل البريد التجاري للموقع.', 'success');
      } catch (error) {
        setStatus(form, 'تم تجهيز الرسالة، لكن المتصفح منع النسخ التلقائي. انسخ النص يدوياً من الحقول.', 'error');
      }
    });
  });
})();

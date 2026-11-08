'use strict';

const scanButton = document.getElementById('scan');
const copyButton = document.getElementById('copy');
const status = document.getElementById('status');
const results = document.getElementById('results');
const limitNote = document.getElementById('limit-note');
let lastReport = null;

function showStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function render(report) {
  document.getElementById('https').textContent = report.https ? 'نعم' : 'لا';
  document.getElementById('scripts').textContent = String(report.crossOriginScripts);
  document.getElementById('frames').textContent = String(report.crossOriginFrames);
  document.getElementById('forms').textContent = String(report.httpFormActions);
  document.getElementById('links').textContent = String(report.blankLinksWithoutNoopener);
  limitNote.hidden = !report.truncated;
  results.hidden = false;
}

scanButton.addEventListener('click', async () => {
  scanButton.disabled = true;
  results.hidden = true;
  lastReport = null;
  showStatus('جارٍ فحص عناصر الصفحة…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !Number.isInteger(tab.id) || !/^https?:\/\//i.test(tab.url || '')) {
      throw new Error('افتح موقع HTTP أو HTTPS في علامة تبويب عادية، ثم أعد المحاولة.');
    }
    const executions = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanDocument
    });
    const report = executions?.[0]?.result;
    if (!report || typeof report.https !== 'boolean' ||
        !['crossOriginScripts', 'crossOriginFrames', 'httpFormActions', 'blankLinksWithoutNoopener']
          .every((key) => Number.isSafeInteger(report[key]) && report[key] >= 0)) {
      throw new Error('تعذّرت قراءة نتيجة فحص سليمة.');
    }
    lastReport = report;
    render(report);
    showStatus('اكتمل الفحص المحلي. لا تُرسل النتائج إلى أي خادم.');
  } catch (error) {
    const isRestricted = /cannot access|cannot be scripted|permissions|missing host permission|chrome:\/\//i.test(String(error?.message || ''));
    showStatus(isRestricted
      ? 'المتصفح يمنع فحص هذه الصفحة. افتح موقع ويب عاديًا.'
      : error?.message || 'حدث خطأ أثناء الفحص.', true);
  } finally {
    scanButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  if (!lastReport) return;
  const r = lastReport;
  const summary = [
    'Digital Insight Privacy Inspector — تقرير محلي',
    `HTTPS: ${r.https ? 'نعم' : 'لا'}`,
    `مصادر JavaScript بأصول مختلفة: ${r.crossOriginScripts}`,
    `إطارات بأصول مختلفة: ${r.crossOriginFrames}`,
    `نماذج HTTP: ${r.httpFormActions}`,
    `روابط دون عزل صريح: ${r.blankLinksWithoutNoopener}`,
    `النتيجة جزئية: ${r.truncated ? 'نعم' : 'لا'}`,
    'مؤشرات فقط وليست إثباتًا للتتبع أو شهادة أمان.'
  ].join('\n');
  try {
    await navigator.clipboard.writeText(summary);
    showStatus('نُسخ ملخص الأرقام دون عنوان الصفحة أو محتواها.');
  } catch (_error) {
    showStatus('تعذّر النسخ؛ راجع أذونات الحافظة.', true);
  }
});

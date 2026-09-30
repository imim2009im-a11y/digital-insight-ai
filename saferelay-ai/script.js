const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const form = document.getElementById('messageForm');
const resultBox = document.getElementById('resultBox');
const messageText = document.getElementById('messageText');
const messageType = document.getElementById('messageType');

const blockedTerms = [
  'اقتل','قتل','تهديد','ابتزاز','فضيحة','افضح','انتحر','كراهية','لعنة','حقير','كلب','حيوان',
  'kill','threat','blackmail','suicide','hate','expose','stupid','idiot'
];

const riskyPatterns = [
  /\b05\d{8}\b/,
  /\b\d{10,}\b/,
  /@\w{3,}/,
  /https?:\/\//
];

function analyzeMessage(text) {
  const clean = text.trim().toLowerCase();
  const hits = blockedTerms.filter(term => clean.includes(term));
  const hasRiskyData = riskyPatterns.some(pattern => pattern.test(clean));
  const length = clean.length;

  if (!length) {
    return { level: 'warn', title: 'الرسالة فارغة', body: 'اكتب رسالة أولاً حتى يتم تحليلها.' };
  }

  if (length < 12) {
    return { level: 'warn', title: 'الرسالة قصيرة جداً', body: 'اكتب رسالة أوضح حتى لا تبدو مزعجة أو غير مفهومة.' };
  }

  if (hits.length) {
    return { level: 'danger', title: 'مرفوضة مبدئياً', body: `تم رصد كلمات أو نبرة عالية الخطورة: ${hits.join('، ')}. يجب إعادة الصياغة قبل الإرسال.` };
  }

  if (hasRiskyData) {
    return { level: 'warn', title: 'تحتاج مراجعة', body: 'تم رصد رقم، رابط، أو معرف حساب. في النسخة الحقيقية يجب مراجعتها لتجنب التشهير أو الإزعاج.' };
  }

  return { level: 'ok', title: 'قابلة للإرسال مبدئياً', body: 'الرسالة تبدو خالية من المخاطر الواضحة. في النسخة النهائية ستمر عبر فلترة AI وBackend آمن قبل الإرسال.' };
}

function suggestRewrite(text, type) {
  const base = text.trim();
  if (!base) return '';
  const prefixes = {
    'اعتذار': 'أرغب في إيصال اعتذار محترم دون إحراج: ',
    'نصيحة': 'هذه ملاحظة بنية طيبة وأتمنى أن تُفهم باحترام: ',
    'ملاحظة عمل': 'ملاحظة مهنية أود إيصالها بهدوء: ',
    'شكوى': 'أرغب في تقديم ملاحظة تحتاج معالجة، بصيغة محترمة: ',
    'إعجاب محترم': 'رسالة تقدير محترمة دون أي ضغط أو إزعاج: ',
    'تنبيه': 'تنبيه مهم أرسله بنية الإصلاح وليس الإساءة: '
  };
  return `${prefixes[type] || ''}${base}`;
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = messageText.value;
    const type = messageType.value;
    const analysis = analyzeMessage(text);
    const rewrite = suggestRewrite(text, type);

    resultBox.className = `result show ${analysis.level}`;
    resultBox.innerHTML = `
      <strong>${analysis.title}</strong>
      <p>${analysis.body}</p>
      ${analysis.level !== 'danger' ? `<hr><p><strong>صياغة مقترحة:</strong><br>${escapeHtml(rewrite)}</p>` : '<p>الاقتراح المهني: أعد كتابة الرسالة بنبرة هادئة ومحددة.</p>'}
    `;
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

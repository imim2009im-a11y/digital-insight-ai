/* Progressive UI: no cookies, remote calls or trackers. */
(() => {
 'use strict';
 const $ = (id) => document.getElementById(id);
 document.querySelectorAll('[data-copy-article]').forEach((button) => {
   button.addEventListener('click', async () => {
     const status = button.parentElement.querySelector('.share-status');
     try {
       if (!navigator.clipboard || !navigator.clipboard.writeText) throw Error('unsupported');
       await navigator.clipboard.writeText(location.href.split('#')[0]);
       if (status) status.textContent = 'نُسخ رابط الصفحة.';
     } catch (_) {
       if (status) status.textContent = 'النسخ غير متاح هنا؛ انسخ رابط الصفحة من شريط المتصفح.';
     }
   });
 });
 document.querySelectorAll('[data-share-article]').forEach((button) => {
   button.addEventListener('click', async () => {
     const status = button.parentElement.querySelector('.share-status');
     if (!navigator.share) { if (status) status.textContent = 'استخدم نسخ الرابط لمشاركته.'; return; }
     try {
       await navigator.share({ title: document.title, url: location.href.split('#')[0] });
       if (status) status.textContent = 'تم فتح خيارات المشاركة.';
     } catch (error) {
       if (error && error.name !== 'AbortError' && status) status.textContent = 'تعذرت المشاركة من الجهاز.';
     }
   });
 });
 const newsSearch = $('news-search');
 if (newsSearch) {
   const cards = [...document.querySelectorAll('#news-results article')];
   const count = $('news-count'), empty = $('news-empty');
   const normalize = (s) => String(s || '').normalize('NFKC').toLocaleLowerCase('ar').replace(/[\u064b-\u065f]/g, '').trim();
   function update() {
     const q = normalize(newsSearch.value);
     let visible = 0;
     cards.forEach((card) => { const show = !q || normalize(card.textContent).includes(q); card.hidden = !show; if (show) visible++; });
     if (count) count.textContent = 'النتائج: ' + visible + ' من ' + cards.length;
     if (empty) empty.hidden = visible !== 0;
   }
   newsSearch.addEventListener('input', update);
   update();
 }
 const costOutput = $('calc-result');
 if (costOutput) {
   const fields = ['calc-tasks','calc-minutes','calc-hourly','calc-cost'].map($);
   const details = $('calc-details');
   const formatter = new Intl.NumberFormat('ar-SA', {style:'currency', currency:'SAR', maximumFractionDigits:2});
   function updateCost() {
     const values = fields.map((el) => {
       const num = Number(el.value);
       const min = Number(el.min || 0), max = Number(el.max || 100000);
       return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : 0;
     });
     const [tasks, minutes, hourly, fee] = values;
     const hours = tasks * minutes / 60;
     const beforeFee = hours * hourly;
     const afterFee = beforeFee - fee;
     costOutput.textContent = formatter.format(afterFee);
     if (details) details.textContent = 'الوقت المحتمل: ' + new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(hours) + ' ساعة/شهر. القيمة قبل تكلفة الاشتراك: ' + formatter.format(beforeFee) + '.';
     costOutput.dataset.direction = afterFee < 0 ? 'negative' : 'positive';
   }
   fields.forEach((field) => field.addEventListener('input', updateCost));
   updateCost();
 }
})();

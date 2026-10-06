/* Accessible, no-dependency directory interactions. Never transmits user input. */
(() => {
  'use strict';
  const search = document.getElementById('tool-search');
  const category = document.getElementById('tool-category');
  if (!search || !category) return;
  const cards = [...document.querySelectorAll('[data-tool-card]')];
  const counter = document.getElementById('tool-results-count');
  const empty = document.getElementById('tool-no-results');
  const rows = document.getElementById('comparison-rows');
  const comparisonWrap = document.getElementById('comparison-table-wrap');
  const compareStatus = document.getElementById('compare-status');
  const selected = new Set();
  const normalize = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase('ar').replace(/[\u064b-\u065f]/g, '').trim();
  const validCategories = new Set(['all', 'video', 'design', 'apps', '3d']);
  const requested = new URLSearchParams(location.search).get('category');
  if (validCategories.has(requested)) category.value = requested;
  function filter() {
    const q = normalize(search.value);
    let visible = 0;
    cards.forEach((card) => {
      const matches = (category.value === 'all' || card.dataset.category === category.value)
        && (!q || normalize(card.textContent).includes(q));
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    counter.textContent = visible + (visible === 1 ? ' أداة مطابقة' : ' أدوات مطابقة');
    empty.hidden = visible !== 0;
  }
  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }
  function showComparison(message) {
    rows.replaceChildren();
    comparisonWrap.hidden = selected.size < 2;
    cards.forEach((card) => {
      const name = card.querySelector('h2').textContent.trim();
      const button = card.querySelector('.compare-button');
      const isSelected = selected.has(name);
      button.setAttribute('aria-pressed', String(isSelected));
      button.textContent = isSelected ? 'إزالة من المقارنة' : 'أضف للمقارنة';
      if (!isSelected || selected.size < 2) return;
      const tr = document.createElement('tr');
      tr.append(cell(name), cell(card.dataset.focus));
      const detail = document.createElement('td');
      if (card.dataset.review) {
        const a = document.createElement('a');
        a.href = card.dataset.review;
        a.textContent = 'اقرأ المراجعة الموثقة';
        detail.append(a);
      } else {
        detail.textContent = 'لا توجد مراجعة مفصّلة بعد';
      }
      tr.append(detail);
      rows.append(tr);
    });
    compareStatus.textContent = message || (selected.size < 2
      ? 'اختر أداتين على الأقل لإظهار الجدول. (' + selected.size + ' من 3)'
      : 'يظهر الآن ' + selected.size + ' من الأدوات للمقارنة حسب الاستخدام.');
  }
  cards.forEach((card) => {
    card.querySelector('.compare-button').addEventListener('click', () => {
      const name = card.querySelector('h2').textContent.trim();
      if (selected.has(name)) selected.delete(name);
      else if (selected.size >= 3) {
        showComparison('الحد الأقصى ثلاث أدوات؛ أزل إحداها قبل إضافة أخرى.');
        return;
      } else selected.add(name);
      showComparison();
    });
  });
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  document.getElementById('reset-filters').addEventListener('click', () => {
    search.value = ''; category.value = 'all'; filter(); search.focus();
    if (location.search && history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
  });
  document.getElementById('clear-comparison').addEventListener('click', () => {
    selected.clear(); showComparison();
  });
  filter();
  showComparison();
})();

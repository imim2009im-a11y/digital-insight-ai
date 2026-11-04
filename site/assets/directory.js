/* Progressive and privacy-preserving AI tools directory.
 * Search and comparisons use only tool cards already published in the page.
 * No remote calls, browser storage, prices or inferred product capabilities.
 */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const search = byId('tool-search');
  const category = byId('tool-category');
  if (!search || !category) return;

  const cards = Array.from(document.querySelectorAll('[data-tool-card]'));
  const counter = byId('tool-results-count');
  const empty = byId('tool-no-results');
  const rows = byId('comparison-rows');
  const comparisonWrap = byId('comparison-table-wrap');
  const compareStatus = byId('compare-status');
  const shortcut = byId('compare-shortcut');
  const scrollHint = byId('comparison-scroll-hint');
  const reset = byId('reset-filters');
  const clear = byId('clear-comparison');
  if (!counter || !empty || !rows || !comparisonWrap || !compareStatus || !reset || !clear) return;

  const selected = new Set();
  const labels = new Map(Array.from(category.options, (option) => [option.value, option.textContent.trim()]));
  const normalize = (value) => String(value || '')
    .normalize('NFKC').toLocaleLowerCase('ar')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ـ/g, '').replace(/\s+/g, ' ').trim();

  // Only accept actual existing select options, not arbitrary URL parameters.
  const requested = new URLSearchParams(location.search).get('category');
  if (labels.has(requested)) category.value = requested;

  function cardName(card) { return card.querySelector('h2').textContent.trim(); }
  function filter() {
    const query = normalize(search.value);
    let visible = 0;
    cards.forEach((card) => {
      const searchable = normalize(cardName(card) + ' ' + card.textContent + ' ' + (card.dataset.focus || ''));
      const matches = (category.value === 'all' || card.dataset.category === category.value)
        && (!query || searchable.includes(query));
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    counter.textContent = visible + (visible === 1 ? ' أداة مطابقة' : ' أدوات مطابقة') + ' من ' + cards.length;
    empty.hidden = visible !== 0;
  }

  function makeCell(tag, value) {
    const cell = document.createElement(tag);
    cell.textContent = value;
    if (tag === 'th') cell.scope = 'row';
    return cell;
  }

  function showComparison(message) {
    rows.replaceChildren();
    const enough = selected.size >= 2;
    comparisonWrap.hidden = !enough;
    if (scrollHint) scrollHint.hidden = !enough;
    if (shortcut) {
      shortcut.hidden = !enough;
      if (enough) shortcut.textContent = 'عرض مقارنة ' + selected.size + ' من الأدوات المختارة';
    }

    cards.forEach((card) => {
      const button = card.querySelector('.compare-button');
      const isSelected = selected.has(card);
      button.setAttribute('aria-pressed', String(isSelected));
      button.textContent = isSelected ? 'إزالة من المقارنة' : 'أضف للمقارنة';
      if (!isSelected || !enough) return;

      const row = document.createElement('tr');
      row.append(
        makeCell('th', cardName(card)),
        makeCell('td', labels.get(card.dataset.category) || 'غير مصنف'),
        makeCell('td', card.dataset.focus || 'لم تُوثق حالة الاستخدام')
      );
      const reference = document.createElement('td');
      // Restrict dynamic review links to known local review routes.
      if (/^\.\.\/reviews\/[a-z0-9-]+\/$/.test(card.dataset.review || '')) {
        const link = document.createElement('a');
        link.href = card.dataset.review;
        link.textContent = 'المراجعة المنشورة';
        reference.append(link);
      } else {
        reference.textContent = 'لم تُنشر مراجعة تفصيلية بعد';
      }
      row.append(reference);
      rows.append(row);
    });
    compareStatus.textContent = message || (enough
      ? 'تم اختيار ' + selected.size + ' أدوات. المقارنة مبنية على الاستخدام والمراجعات المنشورة فقط.'
      : 'اختر أداتين على الأقل لإظهار المقارنة. (' + selected.size + ' من 3)');
  }

  cards.forEach((card) => {
    const button = card.querySelector('.compare-button');
    if (!button) return;
    button.addEventListener('click', () => {
      if (selected.has(card)) selected.delete(card);
      else if (selected.size >= 3) {
        showComparison('الحد الأقصى ثلاث أدوات؛ أزل إحداها قبل إضافة أخرى.');
        return;
      } else selected.add(card);
      showComparison();
    });
  });

  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  reset.addEventListener('click', () => {
    search.value = '';
    category.value = 'all';
    filter();
    search.focus();
    if (location.search && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.hash);
    }
  });
  clear.addEventListener('click', () => {
    selected.clear();
    showComparison();
  });
  filter();
  showComparison();
})();

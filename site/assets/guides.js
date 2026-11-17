/* Client-side discovery over existing published guides. No storage, tracking or network. */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const search = byId('guide-search');
  const topic = byId('guide-topic');
  const sort = byId('guide-sort');
  const list = byId('guides-list');
  const reset = byId('guide-reset');
  const counter = byId('guides-count');
  const empty = byId('guides-empty');
  if (!search || !topic || !sort || !list || !reset || !counter || !empty) return;

  const cards = Array.from(list.querySelectorAll('[data-guide-card]'));
  const normalize = (value) => String(value || '')
    .normalize('NFKC').toLocaleLowerCase('ar')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ـ/g, '').trim();

  function relevance(card, query) {
    if (!query) return 0;
    const heading = card.querySelector('h3');
    const title = normalize(heading ? heading.textContent : '');
    return title.includes(query) ? 2 : 0;
  }

  function update() {
    const query = normalize(search.value);
    const selectedTopic = topic.value;
    const visible = new Set(cards.filter((card) => {
      return (selectedTopic === 'all' || card.dataset.topic === selectedTopic)
        && (!query || normalize(card.textContent + ' ' + (card.dataset.keywords || '')).includes(query));
    }));
    const ordered = cards.slice().sort((a, b) => {
      if (sort.value === 'relevance' && query) {
        const difference = relevance(b, query) - relevance(a, query);
        if (difference) return difference;
      }
      return (b.dataset.date || '').localeCompare(a.dataset.date || '');
    });
    ordered.forEach((card) => {
      list.appendChild(card);
      card.hidden = !visible.has(card);
    });
    counter.textContent = visible.size + (visible.size === 1 ? ' دليل مطابق' : ' أدلة مطابقة') + ' من ' + cards.length;
    empty.hidden = visible.size !== 0;
  }

  search.addEventListener('input', update);
  topic.addEventListener('change', update);
  sort.addEventListener('change', update);
  reset.addEventListener('click', () => {
    search.value = '';
    topic.value = 'all';
    sort.value = 'newest';
    update();
    search.focus();
  });
  update();
})();

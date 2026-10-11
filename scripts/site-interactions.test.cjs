'use strict';
/* No external dependencies: isolate the progressive scripts against minimal fake DOM elements. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('site/assets/site.js', 'utf8');
class Element {
  constructor(props = {}) {
    this.value = props.value || '';
    this.min = props.min || '0';
    this.max = props.max || '100000';
    this.textContent = props.textContent || '';
    this.hidden = false;
    this.dataset = {};
    this.handlers = {};
    this.parentElement = props.parentElement || null;
  }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  trigger(type) { return this.handlers[type](); }
  querySelector() { return null; }
}
function fixture(byId, lists = {}, extras = {}) {
  const document = {
    getElementById: (id) => byId[id] || null,
    querySelectorAll: (selector) => lists[selector] || []
  };
  const context = {
    document,
    location: { href: 'https://digitalinsightai.com/news/sample/#heading' },
    navigator: extras.navigator || {},
    Intl
  };
  vm.runInNewContext(source, context, { filename: 'site/assets/site.js', timeout: 3000 });
  return { byId, context };
}
function field(value, max = 100000) { return new Element({ value: String(value), min: '0', max: String(max) }); }
test('Cost estimator is local, deterministic, updates and handles negative values', () => {
  const els = {
    'calc-tasks': field(20),
    'calc-minutes': field(15, 1440),
    'calc-hourly': field(50),
    'calc-cost': field(100),
    'calc-result': new Element(),
    'calc-details': new Element()
  };
  fixture(els);
  const money = new Intl.NumberFormat('ar-SA', { style:'currency', currency:'SAR', maximumFractionDigits:2 });
  assert.equal(els['calc-result'].textContent, money.format(150));
  els['calc-tasks'].value = '40';
  els['calc-tasks'].trigger('input');
  assert.equal(els['calc-result'].textContent, money.format(400));
  els['calc-cost'].value = '900';
  els['calc-cost'].trigger('input');
  assert.equal(els['calc-result'].textContent, money.format(-400));
  assert.equal(els['calc-result'].dataset.direction, 'negative');
  els['calc-tasks'].value = '-3';
  els['calc-tasks'].trigger('input');
  assert.equal(els['calc-result'].textContent, money.format(-900));
});
test('News search filters Arabic and Latin case-insensitively', () => {
  const cards = [
    new Element({ textContent:'Anthropic Claude training programme' }),
    new Element({ textContent:'تحديثات Google Gemini' }),
    new Element({ textContent:'Claude Sonnet' })
  ];
  const els = { 'news-search':new Element(), 'news-count':new Element(), 'news-empty':new Element() };
  fixture(els, { '#news-results article':cards });
  assert.equal(els['news-count'].textContent, 'النتائج: 3 من 3');
  els['news-search'].value = 'GOOGLE';
  els['news-search'].trigger('input');
  assert.deepEqual(cards.map((x)=>x.hidden),[true,false,true]);
  assert.equal(els['news-count'].textContent,'النتائج: 1 من 3');
  els['news-search'].value = 'خبر غير موجود';
  els['news-search'].trigger('input');
  assert.equal(cards.filter((x)=>!x.hidden).length,0);
  assert.equal(els['news-empty'].hidden,false);
});
test('Article copy button copies only canonical page URL without fragment', async () => {
  let copied;
  const status = new Element();
  const parent = { querySelector:(selector)=>selector==='.share-status'?status:null };
  const copy = new Element({parentElement:parent});
  fixture({}, { '[data-copy-article]':[copy] }, {
    navigator:{clipboard:{writeText:async (url)=>{copied=url;}}}
  });
  await copy.trigger('click');
  assert.equal(copied,'https://digitalinsightai.com/news/sample/');
  assert.equal(status.textContent,'نُسخ رابط الصفحة.');
});
test('Article copy handles unavailable clipboard without a false success claim', async () => {
  const status = new Element();
  const copy = new Element({parentElement:{querySelector:()=>status}});
  fixture({}, { '[data-copy-article]':[copy] });
  await copy.trigger('click');
  assert.match(status.textContent,/غير متاح/);
});

'use strict';
/* Dependency-free tests for the guides library's progressive enhancement. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('site/assets/guides.js', 'utf8');
class Element {
  constructor({value = '', textContent = '', dataset = {}, heading = ''} = {}) {
    this.value = value;
    this.textContent = textContent;
    this.dataset = dataset;
    this.heading = heading;
    this.hidden = false;
    this.handlers = {};
    this.focused = false;
  }
  addEventListener(event, fn) { this.handlers[event] = fn; }
  trigger(event) { this.handlers[event](); }
  querySelector(selector) { return selector === 'h3' ? { textContent: this.heading } : null; }
  focus() { this.focused = true; }
}
function fixture() {
  const entries = [
    new Element({heading:'خطط Google AI', textContent:'Google AI السعودية فيديو', dataset:{topic:'plans',date:'2026-10-07',keywords:'خطط السعودية'}}),
    new Element({heading:'إنشاء فيديو بالعربية',textContent:'إنشاء فيديو باللغة العربية',dataset:{topic:'video',date:'2026-10-06',keywords:'إنشاء صوت سيناريو'}}),
    new Element({heading:'أدوات الأعمال',textContent:'اختيار أدوات الذكاء الاصطناعي للأعمال',dataset:{topic:'business',date:'2026-10-06',keywords:'خصوصية ميزانية'}})
  ];
  const children = [...entries];
  const list = {
    querySelectorAll: selector => selector==='[data-guide-card]'?entries:[],
    appendChild: card => { children.splice(children.indexOf(card),1); children.push(card); }
  };
  const ids = {
    'guide-search':new Element(),
    'guide-topic':new Element({value:'all'}),
    'guide-sort':new Element({value:'newest'}),
    'guide-reset':new Element(),
    'guides-count':new Element(),
    'guides-empty':new Element(),
    'guides-list':list
  };
  vm.runInNewContext(source,{document:{getElementById:(id)=>ids[id]||null},Intl},{filename:'site/assets/guides.js',timeout:3000});
  return {ids,entries,children};
}
test('Guide library keeps published guides visible and sorted without a query', () => {
  const {ids,entries,children}=fixture();
  assert.equal(entries.filter(x=>!x.hidden).length,3);
  assert.match(ids['guides-count'].textContent,/3.*3/);
  assert.equal(children[0].dataset.topic,'plans');
});
test('Guide search handles Arabic diacritics and filters by published categories', () => {
  const {ids,entries}=fixture();
  ids['guide-search'].value='إِنْشَاء';
  ids['guide-search'].trigger('input');
  assert.equal(entries.filter(x=>!x.hidden).length,1);
  assert.equal(entries.find(x=>!x.hidden).dataset.topic,'video');
  ids['guide-search'].value='';
  ids['guide-search'].trigger('input');
  ids['guide-topic'].value='business';
  ids['guide-topic'].trigger('change');
  assert.equal(entries.find(x=>!x.hidden).dataset.topic,'business');
});
test('Guide relevance can prioritize title matches, with an honest empty state', () => {
  const {ids,entries,children}=fixture();
  ids['guide-search'].value='فيديو';
  ids['guide-sort'].value='relevance';
  ids['guide-search'].trigger('input');
  assert.equal(children.filter(x=>!x.hidden)[0].dataset.topic,'video');
  ids['guide-search'].value='لا-وجود-لهذا-الدليل';
  ids['guide-search'].trigger('input');
  assert.equal(entries.filter(x=>!x.hidden).length,0);
  assert.equal(ids['guides-empty'].hidden,false);
  ids['guide-reset'].trigger('click');
  assert.equal(ids['guides-empty'].hidden,true);
  assert.equal(entries.filter(x=>!x.hidden).length,3);
  assert.equal(ids['guide-search'].focused,true);
});

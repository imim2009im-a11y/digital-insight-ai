import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

function element(tag) {
  return {
    tag, children: [], dataset: {}, textContent: '', className: '',
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
  };
}

test('finder catalog uses text nodes and rejects unsafe affiliate schemes', () => {
  const source = read('../start.html');
  const start = source.indexOf('    const addCampaignParams = (url, tool) => {');
  const end = source.indexOf('    const boot = async () => {', start);
  assert.ok(start > -1 && end > start, 'finder implementation is present');
  const recommendations = element('div');
  const document = {
    getElementById: (id) => id === 'recommendations' ? recommendations : null,
    createElement: element,
    createDocumentFragment: () => element('#fragment'),
    createTextNode: (text) => ({tag: '#text', textContent: text}),
  };
  const context = vm.createContext({ URL, document });
  vm.runInContext(source.slice(start, end) + '\nglobalThis.secureFinder = { addCampaignParams, renderTools };', context);
  const { addCampaignParams, renderTools } = context.secureFinder;
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'http://example.org/', 'not a URL']) {
    assert.equal(addCampaignParams(value, 'Tool'), null, 'unsafe URLs cannot become clickable links');
  }
  assert.match(addCampaignParams('https://example.org/a', 'Tool Name'), /^https:\/\/example\.org\/a\?/);
  const payload = '<img src=x onerror=alert(1)>';
  renderTools([{name: payload, label: payload, category: 'video', bestFor: payload,
    strength: payload, caution: payload, url: 'javascript:alert(1)'}], 'video');
  const article = recommendations.children[0].children[0];
  assert.equal(article.children[1].textContent, payload);
  assert.equal(article.children.some((node) => node.tag === 'a'), false);
  assert.equal(source.slice(start, end).includes('innerHTML'), false, 'no HTML parsing sink in tool renderer');

  renderTools([{name: 'Safe Tool', label: 'Safe', category: 'video', bestFor: 'Test',
    strength: 'Test', caution: 'Test', url: 'https://example.org/'}], 'video');
  const safeArticle = recommendations.children[0].children[0];
  const link = safeArticle.children.find((node) => node.tag === 'a');
  assert.ok(link && link.href.startsWith('https://example.org/'));
  assert.equal(link.rel, 'sponsored nofollow noopener noreferrer');
});

test('SafeRelay PII checks remain stable across repeated messages', () => {
  const source = read('../saferelay-ai/script.js');
  const elements = new Map();
  let submit;
  elements.set('messageForm', { addEventListener(type, listener) { if (type === 'submit') submit = listener; } });
  elements.set('messageText', { value: '' });
  elements.set('messageType', { value: 'نصيحة' });
  const resultBox = element('div');
  elements.set('resultBox', resultBox);
  const context = vm.createContext({
    document: {
      getElementById: (id) => elements.get(id) || null,
      createElement: element,
      createTextNode: (value) => ({tag: '#text', textContent: value}),
    },
    Date,
  });
  vm.runInContext(source + '\nglobalThis.safeRelayTests = { analyzeMessage };', context);
  const { analyzeMessage } = context.safeRelayTests;
  for (const message of [
    'الرقم للتواصل 0501234567 وشكراً',
    'هذه وصلة https://example.org للمراجعة',
    'هذا المعرف @exampleaccount للمراجعة',
  ]) {
    for (let i = 0; i < 12; i++) {
      assert.equal(analyzeMessage(message).level, 'warn', 'PII/links must be consistently flagged');
    }
  }
  assert.equal(analyzeMessage('هذا نص طبيعي للمراجعة بدون معلومات شخصية').level, 'ok');
  const payload = '<svg onload=alert(1)> عبارة اختبار إضافية';
  elements.get('messageText').value = payload;
  submit({ preventDefault() {} });
  assert.ok(resultBox.children.length > 0);
  const suggestion = resultBox.children.find((node) => node.tag === 'p' && node.children.length > 0);
  assert.ok(suggestion);
  assert.equal(suggestion.children[2].textContent.includes(payload), true, 'raw message stays a text node');
  assert.equal(source.includes('innerHTML'), false, 'result must not parse arbitrary HTML');
});

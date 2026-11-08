'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scanDocument } = require('../scan.js');

function element(attrs = {}) {
  return { getAttribute: (name) => Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null };
}

function withPage(href, groups, testFn) {
  const oldDocument = global.document;
  const oldLocation = global.location;
  global.location = new URL(href);
  global.document = { querySelectorAll: (selector) => groups[selector] || [] };
  try { return testFn(); }
  finally { global.document = oldDocument; global.location = oldLocation; }
}

test('aggregates without returning URLs or page content', () => {
  const result = withPage('https://example.org/page?token=hidden', {
    'script[src]': [element({ src: '/main.js' }), element({ src: 'https://cdn.example.org/app.js' }), element({ src: 'https://example.org/a.js' })],
    'iframe[src]': [element({ src: 'https://www.example.org/embed' }), element({ src: '/local' }), element({ src: 'javascript:alert(1)' })],
    'form[action]': [element({ action: 'http://another.example/submit' }), element({ action: '/save' }), element({ action: 'mailto:user@example.org' })],
    'a[target="_blank"]': [element({ rel: 'external' }), element({ rel: 'NOOPENER' }), element({ rel: 'noreferrer external' })]
  }, scanDocument);
  assert.deepEqual(result, {
    https: true, crossOriginScripts: 1, crossOriginFrames: 1,
    httpFormActions: 1, blankLinksWithoutNoopener: 1, truncated: false
  });
  assert.equal(JSON.stringify(result).includes('hidden'), false);
});

test('handles HTTP and malformed/empty source values safely', () => {
  const result = withPage('http://example.org/', {
    'script[src]': [element({ src: '::::' }), element({ src: '' }), element({ src: 'data:text/plain,a' }), element({ src: 'https://third.test/lib.js' })]
  }, scanDocument);
  assert.equal(result.https, false);
  assert.equal(result.crossOriginScripts, 1);
});

test('caps each scan at 5000 items and reports partial results', () => {
  const result = withPage('https://example.org/', {
    'script[src]': Array.from({length:5001}, () => element({src:'https://external.test/script.js'}))
  }, scanDocument);
  assert.equal(result.crossOriginScripts, 5000);
  assert.equal(result.truncated, true);
});

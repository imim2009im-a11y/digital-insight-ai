'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('minimal MV3 permissions and no persistent site access', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting']);
  for (const key of ['host_permissions', 'optional_host_permissions', 'background', 'content_scripts', 'externally_connectable']) {
    assert.equal(Object.hasOwn(manifest, key), false, `Unexpected ${key}`);
  }
  assert.equal(manifest.action.default_popup, 'popup.html');
});

test('popup has accessible Arabic direction, and only local scripts', () => {
  const html = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
  assert.match(html, /lang="ar" dir="rtl"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /src="scan.js"/);
  assert.match(html, /src="popup.js"/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
});

test('no automatic network access in scanning scripts', () => {
  const code = fs.readFileSync(path.join(root, 'scan.js'), 'utf8') + fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
  assert.doesNotMatch(code, /\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(|\bWebSocket\s*\(/);
  assert.doesNotMatch(code, /\.innerHTML\s*=/);
});

// Regression test for homepage -> directory category deep-link.
// Run: node tests/directory-category.test.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../site/assets/directory.js'),'utf8');
const homepage = fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const tools = fs.readFileSync(path.join(__dirname,'../site/tools/index.html'),'utf8');
const match = source.match(/const validCategories = new Set\(\[(.*?)\]\)/);
assert.ok(match,'category whitelist is defined');
const accepted = [...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
const options = [...tools.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]);
for (const category of options) assert.ok(accepted.includes(category), 'Missing allowed category: '+category);
assert.ok(homepage.includes('value="marketing"'), 'homepage offers marketing category');
console.log('PASS: every directory category, including marketing, is supported by URL deep links');

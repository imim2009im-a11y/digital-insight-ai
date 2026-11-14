import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sourceUrl = new URL("../assets/baiti.js", import.meta.url);
const source = fs.readFileSync(sourceUrl, "utf8");

const marker = "  document.addEventListener('DOMContentLoaded', initApp);\n})();";
assert.ok(source.includes(marker), "Expected Baiti bootstrap marker was not found");

const instrumented = source.replace(
  marker,
  "  globalThis.__baitiSecurityTest = { escapeHtml };\n})();",
);

const context = vm.createContext({
  console,
  window: {},
  document: {},
});

vm.runInContext(instrumented, context, {
  filename: "assets/baiti.js",
});

const { escapeHtml } = context.__baitiSecurityTest;
assert.equal(typeof escapeHtml, "function");

const payload = `<img src=x onerror="alert(1)"> ' &`;
assert.equal(
  escapeHtml(payload),
  "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &#39; &amp;",
  "HTML metacharacters must be encoded before persisted state reaches innerHTML",
);

const protectedSinks = [
  "${escapeHtml(mode === 'cook' ? order.customer.name : order.cookName)}",
  "${escapeHtml(order.customer.address)}",
  "${escapeHtml(order.customer.phone)}",
  "${escapeHtml(order.customer.notes)}",
  "${escapeHtml(item.name)}",
  "${escapeHtml(product.name)}",
  "${escapeHtml(cook.name)}",
  "${escapeHtml(cook.district)}",
  "${escapeHtml(mainProduct.name)}",
];

for (const sink of protectedSinks) {
  assert.ok(
    source.includes(sink),
    `Expected persisted-state sink to be encoded: ${sink}`,
  );
}

console.log("Baiti stored-XSS regression checks passed.");

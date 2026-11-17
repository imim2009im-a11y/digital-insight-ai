'use strict';

/**
 * Runs in the isolated world of the active tab via chrome.scripting.executeScript.
 * Keep this function self-contained: Chrome serializes it without its outer scope.
 * It returns aggregate counts only; never page content, form values, URLs or titles.
 */
function scanDocument() {
  const limit = 5000;
  const origin = location.origin;
  let truncated = false;

  function httpUrl(raw) {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    try {
      const url = new URL(raw, location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch (_error) {
      return null;
    }
  }

  function count(selector, predicate) {
    const nodes = document.querySelectorAll(selector);
    const length = Math.min(nodes.length, limit);
    if (nodes.length > limit) truncated = true;
    let matching = 0;
    for (let index = 0; index < length; index += 1) {
      if (predicate(nodes[index])) matching += 1;
    }
    return matching;
  }

  const crossOriginScripts = count('script[src]', (node) => {
    const url = httpUrl(node.getAttribute('src'));
    return Boolean(url && url.origin !== origin);
  });
  const crossOriginFrames = count('iframe[src]', (node) => {
    const url = httpUrl(node.getAttribute('src'));
    return Boolean(url && url.origin !== origin);
  });
  const httpFormActions = count('form[action]', (node) => {
    const url = httpUrl(node.getAttribute('action'));
    return Boolean(url && url.protocol === 'http:');
  });
  const blankLinksWithoutNoopener = count('a[target="_blank"]', (node) => {
    const rel = (node.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    return !rel.includes('noopener') && !rel.includes('noreferrer');
  });

  return {
    https: location.protocol === 'https:',
    crossOriginScripts,
    crossOriginFrames,
    httpFormActions,
    blankLinksWithoutNoopener,
    truncated
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scanDocument };
}

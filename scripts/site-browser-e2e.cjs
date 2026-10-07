#!/usr/bin/env node
/**
 * Real-browser Arabic RTL QA. Serves public site/ on localhost and checks
 * all canonical routes at phone/tablet/desktop widths. No form submission,
 * affiliate navigation, service credentials, analytics or paid APIs.
 */
'use strict';
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:18747';
const SITEMAP = readFileSync('site/sitemap.xml', 'utf8');
const routes = [...SITEMAP.matchAll(/<loc>(https:\/\/digitalinsightai\.com\/[^<]*)<\/loc>/g)]
  .map(x => new URL(x[1]).pathname);
assert.equal(routes.length, new Set(routes).size);
assert(routes.length >= 14);

const server = spawn('python3', ['-m', 'http.server', '18747', '--bind',
  '127.0.0.1', '--directory', 'site'], { stdio: 'ignore' });
async function liveServer() {
  for(let i = 0; i < 60; i++){
    try { if((await fetch(BASE + '/robots.txt')).status===200) return; }
    catch (_) {}
    await new Promise(r => setTimeout(r,100));
  }
  throw Error('Local static QA server did not start');
}
async function main() {
  await liveServer();
  let browser;
  try {
    browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  } catch(e) {
    console.log('Bundled Chromium fallback: '+e.message.slice(0,120));
    browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  }
  try {
    for (const width of [320, 390, 768, 1365]) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 },
        deviceScaleFactor: 1,locale:'ar-SA',reducedMotion:'reduce' });
      const page = await ctx.newPage();
      for (const route of routes) {
        const runtimeErrors=[];
        const onError = e => runtimeErrors.push(e.message);
        page.on('pageerror', onError);
        const resp=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:15000});
        assert.equal(resp?.status(),200,route+' HTTP');
        const result=await page.evaluate(() => {
          const html=document.documentElement, body=document.body;
          const honey=document.querySelector('.honey-field');
          const style=honey ? getComputedStyle(honey) : null;
          return {width:window.innerWidth, htmlWidth:html.scrollWidth,
            clientWidth:html.clientWidth,bodyWidth:body.scrollWidth,
            honeypot:style?{clip:style.clipPath,left:style.left}:null,
            h1:document.querySelectorAll('h1').length};
        });
        // Browser scrollWidth can have 1px subpixel rounding discrepancy.
        assert(result.htmlWidth<=result.clientWidth+2,
          JSON.stringify({route,width,overflow:result}));
        assert(result.bodyWidth<=result.width+2,
          JSON.stringify({route,width,bodyOverflow:result}));
        assert.equal(result.h1,1,route+' heading');
        assert.deepEqual(runtimeErrors,[],route+' page JS');
        if(route==='/contact/'){
          assert(result.honeypot && result.honeypot.clip !== 'none',
            'honeypot must be clipped without off-screen overflow');
          assert(await page.locator('form.contact-card input[name="privacy_consent"]').count()===1);
        }
        console.log('PASS',width,route);
        page.off('pageerror',onError);
      }
      if(width===390){
        await page.goto(BASE+'/news/',{waitUntil:'domcontentloaded'});
        await page.locator('#news-search').fill('Gemini');
        assert.equal(await page.locator('#news-results article:visible').count(),1,
          'News filters Gemini');
        await page.goto(BASE+'/tools/',{waitUntil:'domcontentloaded'});
        await page.locator('#tool-category').selectOption('apps');
        assert.equal(await page.locator('[data-tool-card]:visible').count(),1,
          'Directory filters apps');
        const amount=await page.locator('#calc-result').textContent();
        assert(amount && /١٥٠|150/.test(amount),'initial calculator 150 SAR');
        console.log('PASS functional Arabic news filter, tools filter, cost calculation');
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log('PASS mobile / tablet / desktop layout checks over '+routes.length+' canonical routes');
}
(async()=>{try{await main()}catch(e){console.error(e);process.exitCode=1}
finally{server.kill('SIGTERM')}})();

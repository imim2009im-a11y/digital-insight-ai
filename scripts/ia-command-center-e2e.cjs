#!/usr/bin/env node
/**
 * IA Command Center: isolated cloud Chromium UI checks.
 * Serves repository files on loopback; no public deployment, secrets, or paid API.
 */
'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:18759';
const ROUTE = '/prototypes/ia-command-center/';
const server = spawn('python3', ['-m','http.server','18759','--bind','127.0.0.1','--directory','.'], {stdio:'ignore'});

async function waitForServer(){
  for(let tries=0;tries<65;tries++){
    try {const res=await fetch(BASE+ROUTE);if(res.status===200)return;}
    catch (_) {}
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  throw Error('Loopback preview server did not start');
}

async function run(){
 await waitForServer();
 mkdirSync('artifacts/ia-command-center',{recursive:true});
 let browser;
 try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
 catch(e){console.log('Switching to bundled Chromium:',e.message.slice(0,150));browser=await chromium.launch({headless:true,args:['--no-sandbox']});}
 try {
  for(const width of [320,390,768,1365]){
    const context=await browser.newContext({viewport:{width,height:850},locale:'ar-SA',acceptDownloads:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(BASE+ROUTE,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200,'prototype accessible locally');
    const actual=await page.evaluate(()=>{
      const root=document.documentElement,body=document.body;
      return {
        lang:root.lang,
        dir:root.dir,
        h1:document.querySelectorAll('h1').length,
        viewport:innerWidth,
        docScrollWidth:root.scrollWidth,
        bodyScrollWidth:body.scrollWidth,
        noindex:document.querySelector('meta[name="robots"]')?.content,
        externalScripts:document.querySelectorAll('script[src]').length
      };
    });
    await page.screenshot({path:`artifacts/ia-command-center/viewport-${width}.png`,fullPage:true,animations:'disabled'});
    assert.equal(actual.lang,'ar');
    assert.equal(actual.dir,'rtl');
    assert.equal(actual.h1,1);
    assert.equal(actual.noindex,'noindex,nofollow');
    assert.equal(actual.externalScripts,0);
    assert(actual.docScrollWidth<=actual.viewport+2,'html overflow at '+width+': '+JSON.stringify(actual));
    assert(actual.bodyScrollWidth<=actual.viewport+2,'body overflow at '+width+': '+JSON.stringify(actual));
    assert.equal(await page.locator('.project:visible').count(),4,'all projects shown');
    assert.equal(await page.locator('.task').count(),4,'four checklist items');
    assert.deepEqual(errors,[],'runtime errors at '+width);
    if(width===390){
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('skip')),
        true,'skip link keyboard focus');
      await page.keyboard.press('Enter');
      assert(new URL(page.url()).hash==='#content','skip link keyboard activation');
      const design=page.locator('button[data-filter="design"]');
      await design.click();
      assert.equal(await page.locator('.project:visible').count(),1,'design filter');
      assert.equal(await design.getAttribute('aria-pressed'),'true','pressed state');
      await page.locator('button[data-filter="development"]').click();
      assert.equal(await page.locator('.project:visible').count(),2,'development filter');
      await page.locator('button[data-filter="all"]').click();
      assert.equal(await page.locator('.project:visible').count(),4,'all filter restores');
      await page.locator('#task-review').check();
      assert.equal(await page.locator('#task-review').isChecked(),true,'manual checked state');
      await page.reload();
      assert.equal(await page.locator('#task-review').isChecked(),true,'localStorage persisted after reload');
      const downloadPromise=page.waitForEvent('download');
      await page.locator('#export').click();
      const download=await downloadPromise;
      assert.equal(download.suggestedFilename(),'ia-checklist.json','download filename');
      const stream=await download.createReadStream();
      let json='';
      for await(const chunk of stream)json+=chunk.toString('utf8');
      const exported=JSON.parse(json);
      assert.equal(exported.tasks.length,4);
      assert.equal(exported.tasks.find(item=>item.id==='review')?.completed,true,'completed state exported');
      assert(!JSON.stringify(exported).includes('api_key'),'export contains no credentials');
      await page.locator('#clear').click();
      assert.equal(await page.locator('#task-review').isChecked(),false,'clear resets state');
      await page.reload();
      assert.equal(await page.locator('#task-review').isChecked(),false,'clear persists after reload');
      console.log('PASS keyboard skip link, project filtering, task persistence, JSON download, reset');
    }
    console.log('PASS Chromium prototype',width,'px');
    await context.close();
  }
 }finally{await browser.close();}
}
(async()=>{try{await run();}catch(e){console.error(e);process.exitCode=1;}finally{server.kill('SIGTERM');}})();

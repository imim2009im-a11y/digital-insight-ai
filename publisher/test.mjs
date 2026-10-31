import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run a copied server in an isolated directory; never use real jobs or credentials.
const original = join(dirname(fileURLToPath(import.meta.url)), 'server.mjs');
const token = 'local-test-scheduler-token-32-characters-minimum';

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const p = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return p;
}

async function exercise(configured) {
  const dir = mkdtempSync(join(tmpdir(), 'dip-security-test-'));
  const source = join(dir, 'server.mjs');
  copyFileSync(original, source);
  const listenPort = await freePort();
  const child = spawn(process.execPath, [source], {
    env: {
      PATH: process.env.PATH || '',
      PORT: String(listenPort),
      ADMIN_PASSWORD: 'local-test-password',
      SESSION_SECRET: 'local-test-session-secret',
      DIA_SCHEDULER_TOKEN: configured ? token : '',
      DIA_ALLOW_EMPTY_STATE_BOOTSTRAP: 'ISOLATED_TEST_ONLY',
      NODE_ENV: 'test',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      DISCORD_WEBHOOK_URL: '',
    },
    stdio: 'ignore',
  });
  const request = async (route, options = {}) => {
    const response = await fetch('http://127.0.0.1:' + listenPort + route, options);
    return { status: response.status, body: await response.json() };
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Test server exited ' + child.exitCode);
      try {
        const health = await request('/api/health');
        if (health.status === 200 && health.body.ok) { ready = true; break; }
      } catch { /* still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'test server did not become ready');
    assert.equal((await request('/api/state')).status, 401, 'state must require login');
    const anonymous = await request('/api/run-due', { method: 'POST' });
    if (configured) {
      assert.equal(anonymous.status, 401, 'anonymous scheduler request must be denied');
      assert.equal((await request('/api/run-due', {
        method: 'POST', headers: { Authorization: 'Bearer wrong-token' },
      })).status, 401, 'incorrect credential must be denied');
      const valid = await request('/api/run-due', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token },
      });
      assert.equal(valid.status, 200, 'authorized scheduler request must succeed');
      assert.equal(valid.body.processed, 0, 'isolated test must not publish any jobs');
    } else {
      assert.equal(anonymous.status, 503, 'missing secret must fail closed');
    }
    // A scheduler preflight must be private, bounded, nonpublishing and free of secrets.
    assert.equal((await request('/api/scheduler/preflight')).status, 401, 'preflight requires an admin session');
    const loginResponse = await fetch('http://127.0.0.1:' + listenPort + '/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'local-test-password' }),
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('dip_session='), 'login must supply an HttpOnly session cookie');
    const authHeaders = { Cookie: cookie };
    const loginAgain=await fetch('http://127.0.0.1:' + listenPort + '/api/login',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({password:'local-test-password'}),
    });
    assert.equal(loginAgain.status,200);
    const secondCookie=loginAgain.headers.get('set-cookie')?.split(';')[0];
    assert.ok(secondCookie&&secondCookie!==cookie,'every login must create a distinct session');
    const loggedOut=await request('/api/logout',{method:'POST',headers:{Cookie:secondCookie}});
    assert.equal(loggedOut.status,200);
    assert.equal((await request('/api/state',{headers:{Cookie:secondCookie}})).status,401,'logout must invalidate the session server-side');
    assert.equal((await request('/api/state',{headers:authHeaders})).status,200,'logging out one session must not revoke another');
    const emptyProbe = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(emptyProbe.status, 200);
    assert.equal(emptyProbe.body.schedulerCredentialConfigured, configured);
    assert.equal(emptyProbe.body.credentialParity, 'UNVERIFIED');
    assert.equal(emptyProbe.body.scheduledJobs, 0);
    assert.equal(emptyProbe.body.dueJobs, 0);
    assert.equal(emptyProbe.body.safeMode, true);
    assert.equal(emptyProbe.body.unverifiedJobs, 0);
    assert.equal(emptyProbe.body.manualReviewRequired, false);
    assert.equal(emptyProbe.body.autoPublishEnabled, false,'automatic publication requires explicit environment authorization');
    assert.equal(emptyProbe.body.persistence, 'ephemeral-file');
    assert.equal(emptyProbe.body.publishingTriggered, false);
    const allowedKeys = ['schedulerCredentialConfigured', 'credentialParity', 'scheduledJobs', 'dueJobs', 'safeMode', 'unverifiedJobs', 'manualReviewRequired', 'autoPublishEnabled', 'persistence', 'publishingTriggered'];
    assert.deepEqual(Object.keys(emptyProbe.body).sort(), allowedKeys.sort(), 'no job content or secrets are exposed');
    const created = await request('/api/posts', {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Synthetic', content: 'Local regression test only', platforms: ['telegram'] }),
    });
    assert.equal(created.status, 201);
    const scheduled = await request('/api/schedule', {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ postId: created.body.id, scheduledFor: new Date(Date.now() - 60000).toISOString() }),
    });
    assert.equal(scheduled.status, 201);
    const duplicateSchedule = await request('/api/schedule', {method:'POST',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify({postId:created.body.id,scheduledFor:new Date().toISOString()})});
    assert.equal(duplicateSchedule.status,409,'cannot create a second job for the same post');
    const duplicateManual = await request('/api/publish', {method:'POST',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify({postId:created.body.id,confirm:true})});
    assert.equal(duplicateManual.status,409,'manual publishing cannot duplicate an existing scheduled job');
    if(configured){
      const held=await request('/api/run-due',{method:'POST',headers:{Authorization:'Bearer '+token}});
      assert.equal(held.status,423,'safe mode must block overdue automatic publishing');
      assert.equal(held.body.processed,0);
      const disabled=await request('/api/settings',{method:'POST',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify({safeMode:false})});
      assert.equal(disabled.status,200);
      const stillHeld=await request('/api/run-due',{method:'POST',headers:{Authorization:'Bearer '+token}});
      assert.equal(stillHeld.status,423,'disabling safe mode must not enable scheduling without the separate release gate');
      assert.equal(stillHeld.body.error,'auto_publishing_disabled');
      const reenabled=await request('/api/settings',{method:'POST',headers:{...authHeaders,'content-type':'application/json'},body:JSON.stringify({safeMode:true})});
      assert.equal(reenabled.status,200);
    }
    const beforeProbe = await request('/api/state', { headers: authHeaders });
    assert.equal(beforeProbe.body.jobs[0].status, 'SCHEDULED');
    const dueProbe = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(dueProbe.status, 200);
    assert.equal(dueProbe.body.scheduledJobs, 1);
    assert.equal(dueProbe.body.dueJobs, 1);
    assert.equal(dueProbe.body.publishingTriggered, false);
    const afterProbe = await request('/api/state', { headers: authHeaders });
    assert.deepEqual(afterProbe.body, beforeProbe.body, 'preflight must not mutate pending jobs');
    // Token parity probe is deliberately distinct from the publishing endpoint.
    const invalidCredentialCheck = await request('/api/scheduler/check', {
      method: 'POST', headers: { Authorization: 'Bearer incorrect-token' },
    });
    assert.equal(invalidCredentialCheck.status, configured ? 401 : 503);
    if (configured) {
      const matchingCheck = await fetch('http://127.0.0.1:' + listenPort + '/api/scheduler/check', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token },
      });
      assert.equal(matchingCheck.status, 204, 'matching scheduler token must be verifiable without publishing');
      assert.equal(await matchingCheck.text(), '', 'credential check must not return secrets or job data');
      const unmodified = await request('/api/state', { headers: authHeaders });
      assert.deepEqual(unmodified.body, beforeProbe.body, 'credential check must not execute due jobs');
    }
    // Overlapping requests must not overwrite each other's jobs/posts.
    const concurrent = await Promise.all(Array.from({length:16}, (_,i)=>request('/api/posts',{
      method:'POST',headers:{...authHeaders,'content-type':'application/json'},
      body:JSON.stringify({title:'Concurrent '+i,content:'Synthetic safe test',platforms:['telegram']}),
    })));
    assert.ok(concurrent.every(v=>v.status===201),'parallel creation must be serialized');
    const allPosts=await request('/api/state',{headers:authHeaders});
    assert.equal(allPosts.body.posts.length,17,'all concurrent writes must survive');
    const samePost=concurrent[0].body.id;
    const claims=await Promise.all([1,2].map(()=>request('/api/schedule',{
      method:'POST',headers:{...authHeaders,'content-type':'application/json'},
      body:JSON.stringify({postId:samePost,scheduledFor:new Date().toISOString()}),
    })));
    assert.deepEqual(claims.map(v=>v.status).sort(),[201,409],'exactly one concurrent scheduling request wins');
    const statePath = join(dir, 'data', 'store.json');
    const savedState = readFileSync(statePath, 'utf8');
    unlinkSync(statePath);
    const missingProbe = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(missingProbe.status, 503, 'preflight must refuse absent state');
    assert.equal(missingProbe.body.error, 'scheduler_state_unavailable');
    assert.equal(existsSync(statePath), false, 'preflight must never create a missing state file');
    // Regular startup without the test-only bootstrap flag is covered by a separate fail-closed run.
    writeFileSync(statePath, '{invalid-json');
    const corruptProbe = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(corruptProbe.status, 503, 'preflight must refuse corrupted state');
    assert.equal(readFileSync(statePath, 'utf8'), '{invalid-json', 'preflight must not repair or overwrite corrupted state');
    const healthOnCorrupt = await request('/api/health');
    assert.equal(healthOnCorrupt.status, 503, 'regular API must fail closed on corrupted state');
    assert.equal(healthOnCorrupt.body.error, 'publisher_state_unavailable');
    assert.equal(readFileSync(statePath, 'utf8'), '{invalid-json', 'regular API must preserve corrupted data for recovery');
    const invalidStructure = JSON.stringify({ posts: [], jobs: null, audit: [] });
    writeFileSync(statePath, invalidStructure);
    const malformedStateHealth = await request('/api/health');
    assert.equal(malformedStateHealth.status, 503, 'regular API must reject malformed persisted state');
    assert.equal(readFileSync(statePath, 'utf8'), invalidStructure, 'malformed state must not be overwritten');
    const invalidPosts = JSON.stringify({ posts: null, jobs: [], audit: [] });
    writeFileSync(statePath, invalidPosts);
    const malformedPreflight = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(malformedPreflight.status, 503, 'preflight must reject incomplete persisted state, not just invalid jobs');
    assert.equal(readFileSync(statePath, 'utf8'), invalidPosts, 'incomplete state remains untouched');
    writeFileSync(statePath, savedState);
    // The test bootstrap variable is intentionally limited to a synthetic process;
    // restoration should leave old state intact rather than re-bootstrap it.
    const restoredProbe = await request('/api/scheduler/preflight', { headers: authHeaders });
    assert.equal(restoredProbe.status, 200);
    assert.equal(restoredProbe.body.dueJobs, 2, 'both distinct pending jobs must survive failed-state recovery without publication');
    const sourceState = JSON.parse(savedState);
    sourceState.jobs.push({id:'synthetic-unverified',postId:'missing',status:'PUBLISHING',platforms:[],updatedAt:new Date().toISOString()});
    writeFileSync(statePath, JSON.stringify(sourceState));
    const crashed=await request('/api/scheduler/preflight',{headers:authHeaders});
    assert.equal(crashed.status,200);
    assert.equal(crashed.body.unverifiedJobs,1,'incomplete outbound publications require operator review');
    assert.equal(crashed.body.manualReviewRequired,true);
    const unchanged=await request('/api/state',{headers:authHeaders});
    assert.equal(unchanged.body.jobs.find(j=>j.id==='synthetic-unverified').status,'PUBLISHING','preflight must never retry an ambiguous publication');
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
    });
    rmSync(dir, { recursive: true, force: true });
  }
}

async function exerciseFailClosedColdStart(){
  const dir=mkdtempSync(join(tmpdir(),'dip-coldstart-test-'));
  copyFileSync(original,join(dir,'server.mjs'));
  const port=await freePort();
  const child=spawn(process.execPath,[join(dir,'server.mjs')],{
    env:{PATH:process.env.PATH||'',PORT:String(port),NODE_ENV:'production',
      DIA_ALLOW_EMPTY_STATE_BOOTSTRAP:'',ADMIN_PASSWORD:'synthetic-admin',
      SESSION_SECRET:'synthetic-session',DIA_SCHEDULER_TOKEN:''},
    stdio:'ignore',
  });
  try{
    let status=0;
    for(let i=0;i<50;i++){
      if(child.exitCode!==null)throw new Error('cold-start process exited');
      try{const response=await fetch('http://127.0.0.1:'+port+'/api/health');status=response.status;if(status===503)break}
      catch{/* startup */ }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(status,503,'production must refuse an absent backing state');
    assert.equal(existsSync(join(dir,'data','store.json')),false,'production must not generate a replacement empty queue');
  }finally{
    child.kill('SIGTERM');
    await new Promise(resolve=>child.exitCode!==null||child.signalCode!==null?resolve():child.once('exit',resolve));
    rmSync(dir,{recursive:true,force:true});
  }
}

await exerciseFailClosedColdStart();
await exercise(false);
await exercise(true);
console.log('PASS: scheduler authentication, fail-closed behavior, isolated test data');

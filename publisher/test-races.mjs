import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fake outbound fetch runs only in a disposable child process; no real provider calls.
const original = join(dirname(fileURLToPath(import.meta.url)), 'server.mjs');
const temp = mkdtempSync(join(tmpdir(), 'dip-outbound-race-'));
const source = join(temp, 'server.mjs');
const preload = join(temp, 'block-outbound.mjs');
const marker = join(temp, 'mock-send-entered');
const stateFile = join(temp, 'data', 'store.json');
copyFileSync(original, source);
writeFileSync(preload, [
  "import { readFileSync, writeFileSync } from 'node:fs';",
  "globalThis.fetch = async (url, options = {}) => {",
  "  if (String(url) !== 'https://api.telegram.org/botTEST-NO-REAL-SEND/sendMessage') throw new Error('unexpected_outbound_network_call');",
  "  const sentText = JSON.parse(options.body || '{}').text;",
  "  if (sentText === 'Synthetic error path') throw new Error('upstream URL contained SYNTHETIC-PROVIDER-SECRET');",
  "  const count = Number(readFileSync(process.env.DIA_TEST_MARKER, 'utf8') || 0);",
  "  writeFileSync(process.env.DIA_TEST_MARKER, String(count + 1));",
  "  await new Promise(resolve => setTimeout(resolve, 950));",
  "  return {ok:true,status:200,json:async()=>({ok:true,result:{message_id:123456}})};",
  "};",
].join('\n'));

async function freePort() {
  const sock = createServer();
  await new Promise(resolve => sock.listen(0, '127.0.0.1', resolve));
  const port = sock.address().port;
  await new Promise(resolve => sock.close(resolve));
  return port;
}
const port = await freePort();
const base = 'http://127.0.0.1:' + port;
let child;
function startServer(testBootstrap) {
  child = spawn(process.execPath, ['--import', preload, source], {
    env: {
      PATH: process.env.PATH || '',
      PORT: String(port),
      NODE_ENV: testBootstrap ? 'test' : 'production',
      DIA_ALLOW_EMPTY_STATE_BOOTSTRAP: testBootstrap ? 'ISOLATED_TEST_ONLY' : '',
      DIA_TEST_MARKER: marker,
      ADMIN_PASSWORD: 'SYNTHETIC-ADMIN-NOT-A-SECRET',
      SESSION_SECRET: 'SYNTHETIC-SESSION-NOT-A-SECRET',
      DIA_SCHEDULER_TOKEN: 'SYNTHETIC-SCHEDULER-NOT-A-SECRET-123456',
      DIA_AUTO_PUBLISH_ENABLED: 'true',
      DIA_RELEASE_APPROVALS_ENABLED: 'true',
      DIA_ADMIN_ORIGIN: base,
      TELEGRAM_BOT_TOKEN: 'TEST-NO-REAL-SEND',
      TELEGRAM_CHAT_ID: 'TEST-NO-REAL-SEND',
      DISCORD_WEBHOOK_URL: '',
    },
    stdio: 'ignore',
  });
}
async function stopServer() {
  if (!child) return;
  const proc = child;
  proc.kill('SIGTERM');
  await new Promise(resolve => {
    if (proc.exitCode !== null || proc.signalCode !== null) return resolve();
    proc.once('exit', resolve);
  });
  child = null;
}
async function waitFor(check, reason, iterations = 80) {
  for (let i = 0; i < iterations; i++) {
    if (child?.exitCode !== null) throw new Error('Synthetic publisher exited');
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out: ' + reason);
}
async function request(route, options = {}) {
  const res = await fetch(base + route, options);
  return {status: res.status, body: await res.json()};
}
async function login() {
  const response = await fetch(base + '/api/login', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({password: 'SYNTHETIC-ADMIN-NOT-A-SECRET'}),
  });
  assert.equal(response.status, 200);
  const session = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(session?.startsWith('dip_session='));
  return {'Cookie': session, 'content-type': 'application/json', 'Origin': base, 'X-Requested-With': 'DigitalInsightPublisher'};
}
async function createPost(headers, title, content = 'Synthetic content - never send to real provider') {
  const result = await request('/api/posts', {
    method: 'POST', headers,
    body: JSON.stringify({title, content, platforms: ['telegram']}),
  });
  assert.equal(result.status, 201);
  return result.body;
}
async function publish(headers, postId) {
  return request('/api/publish', {
    method: 'POST', headers, body: JSON.stringify({postId, confirm: true}),
  });
}

try {
  startServer(true);
  await waitFor(async () => {
    try {return (await request('/api/health')).status === 200} catch {return false}
  }, 'synthetic server ready');
  let headers = await login();
  const safeModeOff = await request('/api/settings', {method:'POST',headers,body:JSON.stringify({safeMode:false})});
  assert.equal(safeModeOff.status,200,'synthetic manual publish requires explicit Safe Mode disablement');

  const first = await createPost(headers, 'Slow outbound');
  const pendingPublish = publish(headers, first.id);
  await waitFor(() => existsSync(marker), 'fake provider request reached');
  const concurrent = await Promise.all(Array.from({length: 12}, (_, i) => createPost(headers, 'Parallel edit ' + i)));
  assert.equal(concurrent.length, 12);
  const firstOutcome = await pendingPublish;
  assert.equal(firstOutcome.status, 200);
  assert.equal(firstOutcome.body.status, 'PUBLISHED');
  const saved = await request('/api/state', {headers});
  assert.equal(saved.status, 200);
  assert.equal(saved.body.posts.length, 13, 'concurrent writes must survive outbound wait');
  assert.equal(saved.body.jobs.length, 1);
  assert.equal(saved.body.jobs[0].status, 'PUBLISHED');
  assert.equal(new Set(saved.body.posts.map(p => p.id)).size, 13);

  // Simulate a legacy duplicate job already present in a recovered offline snapshot.
  const legacyDuplicate = {...saved.body.jobs[0], id:'legacy-duplicate-job', status:'SCHEDULED', scheduledFor:new Date(Date.now()-60_000).toISOString(), error:null, results:[]};
  writeFileSync(stateFile, JSON.stringify({...saved.body, jobs:[...saved.body.jobs, legacyDuplicate]}, null, 2));
  if (existsSync(marker)) unlinkSync(marker);
  const schedulerHeaders={Authorization:'Bearer SYNTHETIC-SCHEDULER-NOT-A-SECRET-123456','content-type':'application/json'};
  const broadRun = await request('/api/run-due', {method:'POST',headers:schedulerHeaders,body:'{}'});
  assert.equal(broadRun.status,409,'scheduler must reject broad backlog execution without release IDs');
  const duplicatePreview=await request('/api/scheduler/release-preview?jobId=legacy-duplicate-job',{headers});
  assert.equal(duplicatePreview.status,409,'a legacy duplicate of a published post cannot receive approval');
  assert.equal(existsSync(marker),false,'legacy duplicate must not call the provider');

  const providerFailureDraft = await createPost(headers, 'Provider error disclosure', 'Synthetic error path');
  const providerFailure = await publish(headers, providerFailureDraft.id);
  assert.equal(providerFailure.status,200);
  assert.equal(providerFailure.body.status,'FAILED');
  assert.ok(!JSON.stringify(providerFailure.body).includes('SYNTHETIC-PROVIDER-SECRET'),'provider exception text must not be returned to clients');
  const failureState = await request('/api/state',{headers});
  assert.ok(!JSON.stringify(failureState.body).includes('SYNTHETIC-PROVIDER-SECRET'),'provider exception text must not be persisted');

  const releasedPost=await createPost(headers,'Approved scheduled release');
  const scheduledRelease=await request('/api/schedule',{method:'POST',headers,body:JSON.stringify({postId:releasedPost.id,scheduledFor:new Date(Date.now()-60_000).toISOString()})});
  assert.equal(scheduledRelease.status,201);
  const releasePreview=await request('/api/scheduler/release-preview?jobId='+encodeURIComponent(scheduledRelease.body.id),{headers});
  assert.equal(releasePreview.status,200);
  const approval=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:scheduledRelease.body.id,fingerprint:releasePreview.body.fingerprint,confirm:true})});
  assert.equal(approval.status,201);
  assert.match(approval.body.releaseId,/^[0-9a-f-]{36}$/);
  const missingManifest=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:'{}'});
  assert.equal(missingManifest.status,409);
  assert.equal(existsSync(marker),false,'unapproved scheduled jobs must not call the provider');
  const released=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[approval.body.releaseId]})});
  assert.equal(released.status,200);
  assert.equal(released.body.processed,1);
  assert.equal(readFileSync(marker,'utf8'),'1');
  const releasedState=await request('/api/state',{headers});
  assert.equal(releasedState.body.jobs.find(job=>job.id===scheduledRelease.body.id).status,'PUBLISHED');
  assert.equal(releasedState.body.jobs.find(job=>job.id===scheduledRelease.body.id).releaseApproval.state,'CONSUMED');
  const replay=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[approval.body.releaseId]})});
  assert.equal(replay.status,409,'a consumed release ID cannot be replayed');
  assert.equal(readFileSync(marker,'utf8'),'1','replay must not call the provider again');

  unlinkSync(marker);
  const interrupted = await createPost(headers, 'Interrupted released job');
  const interruptedSchedule=await request('/api/schedule',{method:'POST',headers,body:JSON.stringify({postId:interrupted.id,scheduledFor:new Date(Date.now()-60_000).toISOString()})});
  assert.equal(interruptedSchedule.status,201);
  const interruptedPreview=await request('/api/scheduler/release-preview?jobId='+encodeURIComponent(interruptedSchedule.body.id),{headers});
  const interruptedApproval=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:interruptedSchedule.body.id,fingerprint:interruptedPreview.body.fingerprint,confirm:true})});
  assert.equal(interruptedApproval.status,201);
  const toInterrupt=request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[interruptedApproval.body.releaseId]})}).catch(()=>null);
  await waitFor(()=>existsSync(marker),'released fake provider request reached');
  const interruptedDisk=JSON.parse(readFileSync(stateFile,'utf8'));
  const interruptedJob=interruptedDisk.jobs.find(job=>job.id===interruptedSchedule.body.id);
  assert.equal(interruptedJob.status,'PUBLISHING');
  assert.equal(interruptedJob.releaseApproval.state,'CONSUMED','approval consumption and job claim must be one saved state transition');
  assert.equal(readFileSync(marker,'utf8'),'1');
  await stopServer();
  await toInterrupt;
  const afterCrash=JSON.parse(readFileSync(stateFile,'utf8'));
  assert.equal(afterCrash.jobs.find(job=>job.id===interruptedSchedule.body.id).status,'PUBLISHING','ambiguous release must remain blocked after crash');
  assert.equal(afterCrash.jobs.find(job=>job.id===scheduledRelease.body.id)?.status,'PUBLISHED');
  startServer(false);
  await waitFor(async () => {
    try {return (await request('/api/health')).status === 200} catch {return false}
  }, 'server restarted from preserved synthetic state');
  headers = await login();
  const staleRelease=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[interruptedApproval.body.releaseId]})});
  assert.equal(staleRelease.status,409,'process restart invalidates approvals from the prior epoch');
  assert.equal(readFileSync(marker,'utf8'),'1','stale replay after restart must not call the provider');
  const probe = await request('/api/scheduler/preflight', {headers});
  assert.equal(probe.status, 200);
  assert.equal(probe.body.unverifiedJobs, 1);
  assert.equal(probe.body.manualReviewRequired, true);
  const afterRestart = await request('/api/state', {headers});
  assert.equal(afterRestart.body.jobs[0].status, 'PUBLISHING');
  assert.equal(readFileSync(marker, 'utf8'), '1', 'restart must not replay ambiguous external send');
  console.log('PASS: outbound wait serialization, interrupted send visibility and no automatic replay');
} finally {
  await stopServer();
  rmSync(temp, {recursive: true, force: true});
}

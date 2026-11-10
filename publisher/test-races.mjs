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
  "import { existsSync, readFileSync, writeFileSync } from 'node:fs';",
  "globalThis.fetch = async (url, options = {}) => {",
  "  if (String(url) !== 'https://api.telegram.org/botTEST-NO-REAL-SEND/sendMessage') throw new Error('unexpected_outbound_network_call');",
  "  const sentText = JSON.parse(options.body || '{}').text;",
  "  if (sentText === 'Synthetic error path') throw new Error('upstream URL contained SYNTHETIC-PROVIDER-SECRET');",
  "  const count = (existsSync(process.env.DIA_TEST_MARKER) ? Number(readFileSync(process.env.DIA_TEST_MARKER, 'utf8') || 0) : 0);",
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
  const legacyFailed = {...legacyDuplicate,id:'legacy-failed-job',status:'FAILED'};
  const legacyPartial = {...legacyDuplicate,id:'legacy-partial-job',status:'PARTIAL_SUCCESS'};
  writeFileSync(stateFile, JSON.stringify({...saved.body, jobs:[...saved.body.jobs, legacyDuplicate, legacyFailed, legacyPartial]}, null, 2));
  if (existsSync(marker)) unlinkSync(marker);
  const schedulerHeaders={Authorization:'Bearer SYNTHETIC-SCHEDULER-NOT-A-SECRET-123456','content-type':'application/json'};
  const broadRun = await request('/api/run-due', {method:'POST',headers:schedulerHeaders,body:'{}'});
  assert.equal(broadRun.status,409,'scheduler must reject broad backlog execution without release IDs');
  const duplicatePreview=await request('/api/scheduler/release-preview?jobId=legacy-duplicate-job',{headers});
  assert.equal(duplicatePreview.status,409,'a legacy duplicate of a published post cannot receive approval');
  for (const jobId of ['legacy-failed-job','legacy-partial-job']) {
    const unsafeLegacyPreview=await request('/api/scheduler/release-preview?jobId='+jobId,{headers});
    assert.equal(unsafeLegacyPreview.status,409,`${jobId} is ambiguous and cannot receive approval`);
  }
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
  const wrongFingerprint=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:scheduledRelease.body.id,fingerprint:'0'.repeat(64),confirm:true})});
  assert.equal(wrongFingerprint.status,409,'approval must match the current task fingerprint');
  const concurrentApprovals=await Promise.all(Array.from({length:2},()=>request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:scheduledRelease.body.id,fingerprint:releasePreview.body.fingerprint,confirm:true})})));
  assert.equal(concurrentApprovals.filter(x=>x.status===201).length,1,'only one concurrent approval for a job may win');
  assert.equal(concurrentApprovals.filter(x=>x.status===409).length,1);
  const approval=concurrentApprovals.find(x=>x.status===201);
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
  for(const mutation of ['content','title','platforms','scheduledFor','status']){
    const post=await createPost(headers,'Fingerprint guard '+mutation);
    const scheduled=await request('/api/schedule',{method:'POST',headers,body:JSON.stringify({postId:post.id,scheduledFor:new Date(Date.now()-60_000).toISOString()})});
    const preview=await request('/api/scheduler/release-preview?jobId='+encodeURIComponent(scheduled.body.id),{headers});
    const approved=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:scheduled.body.id,fingerprint:preview.body.fingerprint,confirm:true})});
    assert.equal(approved.status,201);
    const snapshot=JSON.parse(readFileSync(stateFile,'utf8'));
    const job=snapshot.jobs.find(item=>item.id===scheduled.body.id);
    const target=snapshot.posts.find(item=>item.id===post.id);
    if(mutation==='content')target.content+=' modified';
    if(mutation==='title')target.title+=' modified';
    if(mutation==='platforms')job.platforms=['discord'];
    if(mutation==='scheduledFor')job.scheduledFor=new Date(Date.now()+60_000).toISOString();
    if(mutation==='status')job.status='FAILED';
    writeFileSync(stateFile,JSON.stringify(snapshot,null,2));
    const blocked=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[approved.body.releaseId]})});
    assert.equal(blocked.status,409,mutation+' mutation after approval must invalidate release');
    assert.equal(readFileSync(marker,'utf8'),'1',mutation+' mutation must not call provider');
    const cleanup=JSON.parse(readFileSync(stateFile,'utf8'));
    const current=cleanup.jobs.find(item=>item.id===scheduled.body.id);
    if(current.releaseApproval){current.releaseApproval.state='EXPIRED';writeFileSync(stateFile,JSON.stringify(cleanup,null,2));}
  }
  const expiredPost=await createPost(headers,'Expired release ticket');
  const expiredSchedule=await request('/api/schedule',{method:'POST',headers,body:JSON.stringify({postId:expiredPost.id,scheduledFor:new Date(Date.now()-60_000).toISOString()})});
  const expiredPreview=await request('/api/scheduler/release-preview?jobId='+encodeURIComponent(expiredSchedule.body.id),{headers});
  const expiredApproval=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({jobId:expiredSchedule.body.id,fingerprint:expiredPreview.body.fingerprint,confirm:true})});
  assert.equal(expiredApproval.status,201);
  const expireDisk=JSON.parse(readFileSync(stateFile,'utf8'));
  expireDisk.jobs.find(item=>item.id===expiredSchedule.body.id).releaseApproval.expiresAt=new Date(Date.now()-1000).toISOString();
  writeFileSync(stateFile,JSON.stringify(expireDisk,null,2));
  const expiredAttempt=await request('/api/run-due',{method:'POST',headers:schedulerHeaders,body:JSON.stringify({releaseIds:[expiredApproval.body.releaseId]})});
  assert.equal(expiredAttempt.status,409,'expired release ticket must be rejected');
  assert.equal(readFileSync(marker,'utf8'),'1','expired ticket must not call provider');
  for(const csrfHeaders of [
    {...headers,Origin:'https://attacker.invalid'},
    Object.fromEntries(Object.entries(headers).filter(([key])=>key.toLowerCase()!=='x-requested-with')),
  ]){
    const denied=await request('/api/scheduler/approve-job',{method:'POST',headers:csrfHeaders,body:JSON.stringify({jobId:expiredSchedule.body.id,fingerprint:expiredPreview.body.fingerprint,confirm:true})});
    assert.equal(denied.status,403,'approval must reject wrong Origin and missing custom request marker');
  }
  const capacityCandidates=[];
  for(let i=0;i<4;i++){
    const post=await createPost(headers,'Approval capacity '+i);
    const schedule=await request('/api/schedule',{method:'POST',headers,body:JSON.stringify({postId:post.id,scheduledFor:new Date(Date.now()-60_000).toISOString()})});
    assert.equal(schedule.status,201);
    const preview=await request('/api/scheduler/release-preview?jobId='+encodeURIComponent(schedule.body.id),{headers});
    assert.equal(preview.status,200);
    capacityCandidates.push({jobId:schedule.body.id,fingerprint:preview.body.fingerprint});
  }
  for(let i=0;i<3;i++){
    const result=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({...capacityCandidates[i],confirm:true})});
    assert.equal(result.status,201,'three live approvals fit the global cap');
  }
  const overCapacity=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({...capacityCandidates[3],confirm:true})});
  assert.equal(overCapacity.status,429,'a fourth outstanding approval must be rejected');
  assert.equal(overCapacity.body.error,'release_approval_capacity_reached');
  assert.equal(readFileSync(marker,'utf8'),'1','approval capacity checks must never publish');
  const expireCapacity=JSON.parse(readFileSync(stateFile,'utf8'));
  const firstCapacityJob=expireCapacity.jobs.find(item=>item.id===capacityCandidates[0].jobId);
  firstCapacityJob.releaseApproval.expiresAt=new Date(Date.now()-1000).toISOString();
  writeFileSync(stateFile,JSON.stringify(expireCapacity,null,2));
  const freedSlot=await request('/api/scheduler/approve-job',{method:'POST',headers,body:JSON.stringify({...capacityCandidates[3],confirm:true})});
  assert.equal(freedSlot.status,201,'expired approval cleanup must release the global capacity slot');
  assert.equal(readFileSync(marker,'utf8'),'1','expiry cleanup must not publish');
  console.log('PASS: bounded approvals, expiry and cleanup, fingerprint mutation, CSRF, concurrent approval, crash visibility and no automatic replay');
} finally {
  await stopServer();
  rmSync(temp, {recursive: true, force: true});
}

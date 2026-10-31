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
  "import { writeFileSync } from 'node:fs';",
  "globalThis.fetch = async (url) => {",
  "  if (String(url) !== 'https://api.telegram.org/botTEST-NO-REAL-SEND/sendMessage') throw new Error('unexpected_outbound_network_call');",
  "  writeFileSync(process.env.DIA_TEST_MARKER, 'external-call-started');",
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
async function createPost(headers, title) {
  const result = await request('/api/posts', {
    method: 'POST', headers,
    body: JSON.stringify({title, content: 'Synthetic content - never send to real provider', platforms: ['telegram']}),
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
  unlinkSync(marker);
  const dueResult = await request('/api/run-due', {method:'POST',headers:{Authorization:'Bearer SYNTHETIC-SCHEDULER-NOT-A-SECRET-123456'}});
  assert.equal(dueResult.status,200);
  assert.equal(dueResult.body.processed,1);
  assert.equal(existsSync(marker),false,'legacy duplicate for a successfully published post must not call the provider again');
  const duplicateState = await request('/api/state',{headers});
  const blockedDuplicate = duplicateState.body.jobs.find(job=>job.id==='legacy-duplicate-job');
  assert.equal(blockedDuplicate.status,'FAILED');
  assert.equal(blockedDuplicate.error,'POST_ALREADY_ATTEMPTED_REQUIRES_REVIEW');

  if (existsSync(marker)) unlinkSync(marker);
  const interrupted = await createPost(headers, 'Interrupted outbound');
  const toInterrupt = publish(headers, interrupted.id).catch(() => null);
  await waitFor(() => existsSync(marker), 'second fake provider request reached');
  assert.equal(JSON.parse(readFileSync(stateFile, 'utf8')).jobs[0].status, 'PUBLISHING');
  await stopServer();
  await toInterrupt;
  const afterCrash = JSON.parse(readFileSync(stateFile, 'utf8'));
  assert.equal(afterCrash.jobs[0].status, 'PUBLISHING', 'ambiguous publish must not reset');
  assert.equal(afterCrash.jobs[1].status, 'PUBLISHED');
  unlinkSync(marker);

  startServer(false);
  await waitFor(async () => {
    try {return (await request('/api/health')).status === 200} catch {return false}
  }, 'server restarted from preserved synthetic state');
  headers = await login();
  const probe = await request('/api/scheduler/preflight', {headers});
  assert.equal(probe.status, 200);
  assert.equal(probe.body.unverifiedJobs, 1);
  assert.equal(probe.body.manualReviewRequired, true);
  const afterRestart = await request('/api/state', {headers});
  assert.equal(afterRestart.body.jobs[0].status, 'PUBLISHING');
  assert.equal(existsSync(marker), false, 'restart must not replay ambiguous external send');
  console.log('PASS: outbound wait serialization, interrupted send visibility and no automatic replay');
} finally {
  await stopServer();
  rmSync(temp, {recursive: true, force: true});
}

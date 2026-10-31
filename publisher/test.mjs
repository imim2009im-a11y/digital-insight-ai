import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
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
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
    });
    rmSync(dir, { recursive: true, force: true });
  }
}

await exercise(false);
await exercise(true);
console.log('PASS: scheduler authentication, fail-closed behavior, isolated test data');

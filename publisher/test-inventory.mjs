import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const executable=join(dirname(fileURLToPath(import.meta.url)),'state-inventory.mjs');
const dir=mkdtempSync(join(tmpdir(),'dip-private-inventory-'));
const file=join(dir,'snapshot.json');
const neverLog='PRIVATE-CONTENT-SHOULD-NEVER-PRINT';
const neverLogId='SECRET-POST-ID-NOT-FOR-LOGS';
const state={
  posts:[{id:neverLogId,title:neverLog,content:neverLog,status:'DRAFT'}],
  jobs:[{id:'secret-job-id',postId:neverLogId,status:'SCHEDULED',scheduledFor:'2999-01-01T00:00:00Z'}],
  audit: [{action:'TEST',detail:{private:neverLog}}],
  settings:{safeMode:true,timezone:'Asia/Riyadh'},
  providers:{telegram:{connected:false},discord:{connected:false}},
};
const run=()=>spawnSync(process.execPath,[executable,'--input',file],{encoding:'utf8'});
try{
  const original=JSON.stringify(state);
  writeFileSync(file,original);
  let result=run();
  assert.equal(result.status,0,result.stderr);
  let report=JSON.parse(result.stdout);
  assert.equal(report.status,'INVENTORY_ONLY');
  assert.equal(report.posts,1);
  assert.equal(report.jobs,1);
  assert.equal(report.dueScheduledJobs,0);
  assert.equal(report.evidence,'OFFLINE_LOCAL_SNAPSHOT_NOT_LIVE');
  assert.equal(report.restorationVerified,false);
  assert.match(report.sha256,/^[a-f0-9]{64}$/);
  assert.ok(!result.stdout.includes(neverLog)&&!result.stdout.includes(neverLogId));
  assert.equal(readFileSync(file,'utf8'),original,'inventory is read-only');

  state.jobs.push({id:'secret-job-id',postId:'other-private-post-id',
    status:'PUBLISHING',scheduledFor:'not-a-date'});
  state.jobs.push({id:'another-job',postId:neverLogId,
    status:'SCHEDULED',scheduledFor:'invalid-date'});
  state.jobs.push({id:'third-job',postId:neverLogId,
    status:'SCHEDULED',scheduledFor:'2000-01-01T00:00:00Z'});
  const warningSnapshot=JSON.stringify(state);
  writeFileSync(file,warningSnapshot);
  result=run();
  assert.equal(result.status,0);
  report=JSON.parse(result.stdout);
  assert.equal(report.status,'REVIEW_REQUIRED');
  assert.equal(report.findings.duplicateJobIds,1);
  assert.equal(report.findings.duplicateJobsForPost,2);
  assert.equal(report.findings.orphanJobs,1);
  assert.equal(report.findings.invalidScheduleDates,1);
  assert.equal(report.findings.ambiguousPublishingJobs,1);
  assert.equal(report.dueScheduledJobs,1);
  assert.equal(readFileSync(file,'utf8'),warningSnapshot);
  assert.ok(!result.stdout.includes(neverLog)&&!result.stdout.includes(neverLogId));
  assert.ok(!result.stdout.includes('secret-job-id'));

  writeFileSync(file,'{"posts":"'+neverLog+'"}');
  result=run();
  assert.equal(result.status,2);
  assert.equal(JSON.parse(result.stderr).status,'NOT_VERIFIED');
  assert.ok(!result.stderr.includes(neverLog));
  console.log('PASS: offline snapshot inspection counts only, preserves bytes, rejects malformed data');
} finally {
  rmSync(dir,{recursive:true,force:true});
}

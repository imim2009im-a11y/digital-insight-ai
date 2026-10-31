#!/usr/bin/env node
// Offline snapshot metadata inspection only. This tool never reads the live service,
// modifies any file, calls a provider, or emits post content, titles, identifiers or secrets.
import crypto from 'node:crypto';
import fs from 'node:fs';

const MAX_BYTES=32*1024*1024;
const argv=process.argv.slice(2);
if(argv.length!==2||argv[0]!=='--input'||!argv[1]){
  console.error(JSON.stringify({status:'NOT_VERIFIED',reason:'usage: --input <offline-snapshot>'}));
  process.exitCode=2;
}else{
  try{
    const stat=fs.statSync(argv[1]);
    if(!stat.isFile()||stat.size>MAX_BYTES||stat.size===0)throw new Error('bad_size_or_type');
    const buffer=fs.readFileSync(argv[1]);
    const state=JSON.parse(buffer.toString('utf8'));
    if(!state||typeof state!=='object'||!Array.isArray(state.posts)||!Array.isArray(state.jobs)||
      !Array.isArray(state.audit)||!state.settings||typeof state.settings.safeMode!=='boolean'||
      !state.providers||typeof state.providers!=='object')throw new Error('invalid_snapshot');

    const now=Date.now();
    const postIds=new Set();
    let duplicatePostIds=0;
    for(const post of state.posts){
      if(!post||typeof post.id!=='string'||!post.id||postIds.has(post.id))duplicatePostIds++;
      else postIds.add(post.id);
    }
    const jobIds=new Set(),assigned=new Set();
    let duplicateJobIds=0,duplicateJobsForPost=0,orphanJobs=0,invalidScheduleDates=0;
    let due=0,inProgress=0,unknownJobStatuses=0;
    const states=Object.fromEntries(['SCHEDULED','PUBLISHING','PUBLISHED','FAILED',
      'PARTIAL_SUCCESS','QUEUED'].map(key=>[key,0]));
    for(const job of state.jobs){
      if(!job||typeof job!=='object'){unknownJobStatuses++;continue}
      if(typeof job.id!=='string'||!job.id||jobIds.has(job.id))duplicateJobIds++;
      else jobIds.add(job.id);
      if(typeof job.postId!=='string'||!postIds.has(job.postId))orphanJobs++;
      if(typeof job.postId==='string'&&assigned.has(job.postId))duplicateJobsForPost++;
      else if(typeof job.postId==='string')assigned.add(job.postId);
      if(typeof job.status==='string'&&Object.hasOwn(states,job.status))states[job.status]++;
      else unknownJobStatuses++;
      if(job.status==='PUBLISHING')inProgress++;
      if(job.status==='SCHEDULED'){
        const when=typeof job.scheduledFor==='string'?Date.parse(job.scheduledFor):NaN;
        if(!Number.isFinite(when))invalidScheduleDates++;
        else if(when<=now)due++;
      }
    }
    const problems={
      duplicatePostIds,duplicateJobIds,duplicateJobsForPost,orphanJobs,
      invalidScheduleDates,unknownJobStatuses,ambiguousPublishingJobs:inProgress,
    };
    const needsReview=Object.values(problems).some(x=>x>0);
    console.log(JSON.stringify({
      status:needsReview?'REVIEW_REQUIRED':'INVENTORY_ONLY',
      evidence:'OFFLINE_LOCAL_SNAPSHOT_NOT_LIVE',
      sha256:crypto.createHash('sha256').update(buffer).digest('hex'),
      byteSize:stat.size,
      posts:state.posts.length,jobs:state.jobs.length,auditEntries:state.audit.length,
      jobStatusCounts:states,dueScheduledJobs:due,
      safeMode:state.settings.safeMode,findings:problems,
      restorationVerified:false,productionReleaseApproved:false,
    }));
  }catch{
    // Never echo raw JSON, file path, exception text, credentials or post metadata.
    console.error(JSON.stringify({status:'NOT_VERIFIED',reason:'snapshot_unreadable_or_invalid'}));
    process.exitCode=2;
  }
}

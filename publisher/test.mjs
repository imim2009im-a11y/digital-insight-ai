import { spawn } from 'node:child_process';
const p=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'8799'},stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(400);
const req=async(path,opts={})=>{const r=await fetch(`http://127.0.0.1:8799${path}`,{headers:{'content-type':'application/json'},...opts});return {r,j:await r.json()}};
try{
  let x=await req('/api/health'); if(!x.r.ok||!x.j.ok) throw new Error('health failed');
  x=await req('/api/posts',{method:'POST',body:JSON.stringify({title:'اختبار',content:'محتوى اختبار',platforms:['telegram']})}); if(x.r.status!==201) throw new Error('create post failed'); const post=x.j;
  x=await req('/api/publish',{method:'POST',body:JSON.stringify({postId:post.id})}); if(x.r.status!==409||x.j.error!=='safe_mode_confirmation_required') throw new Error('safe mode failed');
  x=await req('/api/schedule',{method:'POST',body:JSON.stringify({postId:post.id,scheduledFor:new Date().toISOString()})}); if(x.r.status!==201) throw new Error('schedule failed');
  x=await req('/api/run-due',{method:'POST',body:'{}'}); if(!x.r.ok) throw new Error('run due failed');
  console.log('ALL_TESTS_PASSED');
} finally { p.kill('SIGTERM'); }

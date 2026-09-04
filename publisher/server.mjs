import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const dataFile = path.join(__dirname, 'data', 'store.json');
const PORT = Number(process.env.PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_COOKIE = 'dip_session';
const MAX_BODY_BYTES = 1024 * 1024;
const loginAttempts = new Map();

const defaultState = {
  posts: [], jobs: [], audit: [],
  settings: { timezone: 'Asia/Riyadh', safeMode: true, brandName: 'Digital Insight AI', language: 'ar' },
  providers: {
    telegram: { connected: false, mode: 'ENV_REQUIRED' }, discord: { connected: false, mode: 'ENV_REQUIRED' },
    youtube: { connected: false, mode: 'NOT_CONFIGURED' }, instagram: { connected: false, mode: 'NOT_CONFIGURED' },
    facebook: { connected: false, mode: 'NOT_CONFIGURED' }, tiktok: { connected: false, mode: 'NOT_CONFIGURED' },
    x: { connected: false, mode: 'NOT_CONFIGURED' }, linkedin: { connected: false, mode: 'NOT_CONFIGURED' },
    pinterest: { connected: false, mode: 'NOT_CONFIGURED' }, threads: { connected: false, mode: 'NOT_CONFIGURED' },
    bluesky: { connected: false, mode: 'NOT_CONFIGURED' }
  }
};

function ensureDataDir(){fs.mkdirSync(path.dirname(dataFile),{recursive:true})}
function loadState(){ensureDataDir();if(!fs.existsSync(dataFile)){fs.writeFileSync(dataFile,JSON.stringify(defaultState,null,2));return structuredClone(defaultState)}try{return JSON.parse(fs.readFileSync(dataFile,'utf8'))}catch{return structuredClone(defaultState)}}
function saveState(state){ensureDataDir();const tmp=`${dataFile}.tmp`;fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,dataFile)}
function json(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...headers});res.end(JSON.stringify(body))}
function audit(state,action,detail={}){const row={id:crypto.randomUUID(),ts:new Date().toISOString(),action,detail};state.audit.unshift(row);state.audit=state.audit.slice(0,500);return row}
async function readBody(req){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>MAX_BODY_BYTES){const e=new Error('payload_too_large');e.status=413;throw e}chunks.push(c)}const raw=Buffer.concat(chunks).toString('utf8');if(!raw)return{};try{return JSON.parse(raw)}catch{const e=new Error('invalid_json');e.status=400;throw e}}
function refreshProviderState(state){state.providers.telegram.connected=Boolean(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID);state.providers.telegram.mode=state.providers.telegram.connected?'ENV_READY':'ENV_REQUIRED';state.providers.discord.connected=Boolean(process.env.DISCORD_WEBHOOK_URL);state.providers.discord.mode=state.providers.discord.connected?'ENV_READY':'ENV_REQUIRED'}
function timingSafeEqual(a,b){const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function cookieMap(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}))}
function expectedSession(){if(!ADMIN_PASSWORD||!SESSION_SECRET)return'';return crypto.createHmac('sha256',SESSION_SECRET).update(`digital-insight-publisher:${ADMIN_PASSWORD}`).digest('hex')}
function isAuthenticated(req){const token=cookieMap(req)[SESSION_COOKIE]||'';const expected=expectedSession();return Boolean(expected)&&timingSafeEqual(token,expected)}
function clientKey(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()}
function loginAllowed(req){const key=clientKey(req);const now=Date.now();const row=loginAttempts.get(key);if(!row||now-row.windowStart>15*60_000){loginAttempts.set(key,{count:0,windowStart:now});return true}return row.count<8}
function recordLoginFailure(req){const key=clientKey(req);const now=Date.now();const row=loginAttempts.get(key)||{count:0,windowStart:now};if(now-row.windowStart>15*60_000){row.count=0;row.windowStart=now}row.count++;loginAttempts.set(key,row)}
function clearLoginFailures(req){loginAttempts.delete(clientKey(req))}
function requireAuth(req,res){if(!isAuthenticated(req)){json(res,401,{error:'authentication_required'});return false}return true}
function cleanText(v,max){return String(v??'').trim().slice(0,max)}
function validPlatforms(list){const allowed=new Set(['telegram','discord','youtube','instagram','facebook','tiktok','x','linkedin','pinterest','threads','bluesky']);return Array.isArray(list)?[...new Set(list.filter(x=>allowed.has(x)))]:[]}

async function publishTelegram(content){if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID)return{ok:false,code:'MISSING_CREDENTIALS'};const url=`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:content}),signal:AbortSignal.timeout(30_000)});const body=await r.json().catch(()=>({}));if(!r.ok||!body.ok)return{ok:false,code:'PROVIDER_ERROR',status:r.status};return{ok:true,providerId:String(body.result?.message_id||''),externalUrl:null}}
async function publishDiscord(content){if(!process.env.DISCORD_WEBHOOK_URL)return{ok:false,code:'MISSING_CREDENTIALS'};const r=await fetch(process.env.DISCORD_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content}),signal:AbortSignal.timeout(30_000)});if(!r.ok)return{ok:false,code:'PROVIDER_ERROR',status:r.status};return{ok:true,providerId:`discord-${Date.now()}`,externalUrl:null}}
async function executeJob(state,job){if(!['QUEUED','SCHEDULED'].includes(job.status))return;const post=state.posts.find(p=>p.id===job.postId);if(!post){job.status='FAILED';job.error='POST_NOT_FOUND';job.updatedAt=new Date().toISOString();saveState(state);return}job.status='PUBLISHING';job.updatedAt=new Date().toISOString();saveState(state);const results=[];for(const platform of job.platforms){let result;try{if(platform==='telegram')result=await publishTelegram(post.content);else if(platform==='discord')result=await publishDiscord(post.content);else result={ok:false,code:'NOT_IMPLEMENTED'}}catch(e){result={ok:false,code:'EXCEPTION',message:cleanText(e?.message||e,200)}}results.push({platform,...result})}job.results=results;const okCount=results.filter(r=>r.ok).length;job.status=okCount===results.length&&okCount>0?'PUBLISHED':okCount>0?'PARTIAL_SUCCESS':'FAILED';job.updatedAt=new Date().toISOString();audit(state,'PUBLISH_ATTEMPT',{jobId:job.id,status:job.status,results:results.map(r=>({platform:r.platform,ok:r.ok,code:r.code||null,providerId:r.providerId||null}))});saveState(state)}
function staticFile(res,pathname){const rel=pathname==='/'?'index.html':pathname.replace(/^\//,'');const target=path.resolve(publicDir,rel);if(!target.startsWith(`${path.resolve(publicDir)}${path.sep}`)&&target!==path.join(path.resolve(publicDir),'index.html'))return false;if(!fs.existsSync(target)||fs.statSync(target).isDirectory())return false;const ext=path.extname(target);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});fs.createReadStream(target).pipe(res);return true}

const server=http.createServer(async(req,res)=>{const u=new URL(req.url,`http://${req.headers.host}`);const state=loadState();refreshProviderState(state);try{
  if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,service:'Digital Insight Publisher',timezone:state.settings.timezone,authConfigured:Boolean(ADMIN_PASSWORD&&SESSION_SECRET),persistence:'ephemeral-file'});
  if(req.method==='POST'&&u.pathname==='/api/login'){
    if(!ADMIN_PASSWORD||!SESSION_SECRET)return json(res,503,{error:'admin_auth_not_configured'});
    if(!loginAllowed(req))return json(res,429,{error:'too_many_login_attempts'});
    const b=await readBody(req);if(!timingSafeEqual(cleanText(b.password,256),ADMIN_PASSWORD)){recordLoginFailure(req);return json(res,401,{error:'invalid_credentials'})}
    clearLoginFailures(req);return json(res,200,{ok:true},{'set-cookie':`${SESSION_COOKIE}=${expectedSession()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`});
  }
  if(req.method==='POST'&&u.pathname==='/api/logout')return json(res,200,{ok:true},{'set-cookie':`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
  if(req.method==='POST'&&u.pathname==='/api/run-due'){
    const due=state.jobs.filter(j=>j.status==='SCHEDULED'&&new Date(j.scheduledFor)<=new Date());for(const job of due)await executeJob(state,job);return json(res,200,{processed:due.length});
  }
  if(u.pathname.startsWith('/api/')&&!requireAuth(req,res))return;
  if(req.method==='GET'&&u.pathname==='/api/state')return json(res,200,state);
  if(req.method==='POST'&&u.pathname==='/api/posts'){
    const b=await readBody(req);const content=cleanText(b.content,10000);const title=cleanText(b.title,300);const platforms=validPlatforms(b.platforms);if(!content||platforms.length===0)return json(res,400,{error:'content_and_platforms_required'});const post={id:crypto.randomUUID(),title,content,platforms,status:'DRAFT',createdAt:new Date().toISOString(),scheduledFor:null,demo:false};state.posts.unshift(post);audit(state,'POST_CREATED',{postId:post.id,platforms});saveState(state);return json(res,201,post);
  }
  if(req.method==='POST'&&u.pathname==='/api/schedule'){
    const b=await readBody(req);const post=state.posts.find(p=>p.id===b.postId);if(!post)return json(res,404,{error:'post_not_found'});const when=new Date(b.scheduledFor||Date.now());if(Number.isNaN(when.getTime()))return json(res,400,{error:'invalid_schedule_time'});const job={id:crypto.randomUUID(),postId:post.id,platforms:post.platforms,status:'SCHEDULED',scheduledFor:when.toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),results:[]};state.jobs.unshift(job);post.status='SCHEDULED';post.scheduledFor=job.scheduledFor;audit(state,'JOB_SCHEDULED',{jobId:job.id,postId:post.id});saveState(state);return json(res,201,job);
  }
  if(req.method==='POST'&&u.pathname==='/api/publish'){
    const b=await readBody(req);const post=state.posts.find(p=>p.id===b.postId);if(!post)return json(res,404,{error:'post_not_found'});if(state.settings.safeMode&&b.confirm!==true)return json(res,409,{error:'safe_mode_confirmation_required'});const job={id:crypto.randomUUID(),postId:post.id,platforms:post.platforms,status:'QUEUED',scheduledFor:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),results:[]};state.jobs.unshift(job);audit(state,'JOB_QUEUED',{jobId:job.id});saveState(state);await executeJob(state,job);return json(res,200,job);
  }
  if(req.method==='POST'&&u.pathname==='/api/settings'){
    const b=await readBody(req);state.settings={...state.settings,brandName:cleanText(b.brandName||state.settings.brandName,100),safeMode:b.safeMode!==false};audit(state,'SETTINGS_UPDATED',{safeMode:state.settings.safeMode});saveState(state);return json(res,200,state.settings);
  }
  if(req.method==='GET'&&staticFile(res,u.pathname))return;json(res,404,{error:'not_found'});
}catch(e){console.error(e);json(res,e.status||500,{error:e.message==='payload_too_large'?'payload_too_large':e.message==='invalid_json'?'invalid_json':'internal_error'})}});
server.listen(PORT,()=>console.log(`Digital Insight Publisher listening on ${PORT}`));

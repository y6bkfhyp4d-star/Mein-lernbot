/* Real browser, restart-from-cache GENESIS X worker test. Never touches NERYX sw.js. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

const engine=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unsupported browser');
const root=resolve('.'),requests=[];
const allowed=new Set([
 '/eval/genesis-x-worker-offline.html','/eval/genesis-x-test-offline-sw.js',
 ...['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js','genesis-x-research.js',
 'genesis-x-research-lab.js','genesis-x-integration-preview.js',
 'genesis-x-worker.js','genesis-x-worker-client.js'].map(x=>'/modules/'+x)
]);
const server=createServer(async(req,res)=>{
 requests.push(req.url);
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(req.method!=='GET'||!allowed.has(pathname))throw Error('not allowlisted');
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))throw Error('invalid path');
  const bytes=await readFile(file);
  const headers={'Content-Type':extname(file)==='.html'?'text/html':'text/javascript',
   'Cache-Control':'no-store'};
  if(pathname==='/eval/genesis-x-test-offline-sw.js')
   headers['Service-Worker-Allowed']='/';
  res.writeHead(200,headers);res.end(bytes);
 }catch{res.writeHead(404);res.end('not found');}
});
const task=()=>({
 numeric:{training:[0,1,2].map(x=>({x,y:x+2})),validation:[4,7].map(x=>({x,y:x+2})),maxSteps:1},
 logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
 cases:[{x:3,b:4},{x:8,b:20}]
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844},
  ...(engine==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/eval/genesis-x-worker-offline.html',{waitUntil:'load'});
 const reg=await page.evaluate(async()=>{
  if(!('serviceWorker' in navigator))return {supported:false};
  await navigator.serviceWorker.register('/eval/genesis-x-test-offline-sw.js',{scope:'/'});
  await navigator.serviceWorker.ready;
  await new Promise((resolve,reject)=>{
   if(navigator.serviceWorker.controller){resolve();return;}
   const handle=()=>{clearTimeout(timer);resolve();};
   const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',handle);reject(Error('controller missing'));},15000);
   navigator.serviceWorker.addEventListener('controllerchange',handle,{once:true});
  });
  const keys=await caches.keys();
  const cache=await caches.open('genesis-x-test-offline-v1');
  return {supported:true,controlled:!!navigator.serviceWorker.controller,keys,
   paths:(await cache.keys()).map(r=>new URL(r.url).pathname)};
 });
 assert.equal(reg.supported,true);
 assert.equal(reg.controlled,true);
 assert.ok(reg.keys.includes('genesis-x-test-offline-v1'));
 for(const file of allowed)if(file!=='/eval/genesis-x-test-offline-sw.js')
  assert.ok(reg.paths.includes(file),'missing precached '+file);
 assert.equal(reg.paths.length,allowed.size-1);

 const online=await page.evaluate(t=>window.NERYXGenesisXWorkerClient.preview(t),task());
 assert.equal(online.status,'review_required');

 // Network shutdown is an actual unavailable origin, not just a mocked fetch failure.
 await new Promise(ok=>server.close(ok));
 const beforeOffline=requests.length;
 await page.reload({waitUntil:'load',timeout:25000});
 const offline=await page.evaluate(async t=>{
  const candidate=await window.NERYXGenesisXWorkerClient.preview(t);
  const invalid=await window.NERYXGenesisXWorkerClient.preview(null);
  const bad={...t,cases:[{x:3,b:4},,]};
  const sparse=await window.NERYXGenesisXWorkerClient.preview(bad);
  return {candidate,invalid,sparse,controlled:!!navigator.serviceWorker.controller,
   clientOnly:typeof window.NERYXGenesisXChain==='undefined'&&
     typeof window.NERYXGenesisXResearchLab==='undefined',
   clientLoaded:!!window.NERYXGenesisXWorkerClient,
   scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
   storage:localStorage.length,body:document.body.textContent.trim()};
 },task());
 assert.equal(offline.candidate.status,'review_required');
 assert.equal(offline.candidate.publishable,false);
 assert.equal(offline.candidate.checkedCases,2);
 assert.equal(offline.candidate.referenceCases,0);
 assert.equal(offline.candidate.cases,undefined);
 assert.equal(offline.invalid.status,'invalid');
 assert.equal(offline.sparse.status,'invalid');
 assert.equal(offline.controlled,true);
 assert.equal(offline.clientOnly,true);
 assert.equal(offline.clientLoaded,true);
 assert.deepEqual(offline.scripts,['/modules/genesis-x-worker-client.js']);
 assert.equal(offline.storage,0);
 assert.match(offline.body,/Offline Worker/);
 assert.equal(requests.length,beforeOffline,'network request occurred after shutdown');
 assert.deepEqual(errors,[]);
 console.log('GENESIS_X_WORKER_COLD_OFFLINE_OK '+JSON.stringify({
  browser:engine,cachedAssets:reg.paths.length,requestsBeforeShutdown:beforeOffline,
  offline,status:offline.candidate.status
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

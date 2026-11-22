/* Tests a disposable overlay of the REAL NERYX SW without modifying sw.js.
   Positive: cold offline app + new GENESIS X worker.
   Negative: one missing optional module must not harm existing app cache. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import {makeOverlay,GENESIS_WORKER_ASSETS} from './genesis-x-sw-overlay.mjs';
const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unsupported browser');
const root=resolve('.'),original=await readFile(resolve(root,'sw.js'),'utf8');
const overlay=makeOverlay(original);
assert.ok(overlay.includes('const CACHE=\'neryx-offline-v4\';'));
assert.ok(!original.includes('GENESIS_PREVIEW_ASSETS'));
const task=()=>({
 numeric:{training:[0,1,2].map(x=>({x,y:x+2})),validation:[4,7].map(x=>({x,y:x+2})),maxSteps:1},
 logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
 cases:[{x:3,b:4},{x:8,b:20}]
});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.webmanifest':'application/manifest+json','.png':'image/png'};
let browser;
try{
 browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
 for(const missing of [false,true]){
  let requested=[];
  const server=createServer(async(req,res)=>{
   const path=new URL(req.url,'http://127.0.0.1').pathname;
   requested.push(path);
   if(path==='/sw.js'){
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
    res.end(overlay);return;
   }
   if(missing&&path==='/modules/genesis-x-logic.js'){
    res.writeHead(404);res.end('missing optional experiment module');return;
   }
   try{
    const file=resolve(root,'.'+decodeURIComponent(path));
    if(!file.startsWith(root+sep))throw Error('path outside root');
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream',
     'Cache-Control':'no-store'});
    res.end(bytes);
   }catch{res.writeHead(404);res.end('not found');}
  });
  let context;
  try{
   await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
   const origin='http://127.0.0.1:'+server.address().port;
   context=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844},
    ...(browserName==='webkit'?{isMobile:true,hasTouch:true}:{})});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/index.html',{waitUntil:'load',timeout:25000});
   await page.evaluate(async()=>{
    await Promise.race([
     navigator.serviceWorker.ready,
     new Promise((_,reject)=>setTimeout(()=>reject(Error('SW not ready')),15000))
    ]);
   });
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
   const before=await page.evaluate(async()=>({
    keys:(await (await caches.open('neryx-offline-v4')).keys())
      .map(x=>new URL(x.url).pathname),
    controlled:!!navigator.serviceWorker.controller
   }));
   assert.equal(before.controlled,true);
   for(const basic of ['/index.html','/app.js','/modules/orchestrator.js'])
    assert.ok(before.keys.includes(basic),'app asset disappeared '+basic);
   const optional=GENESIS_WORKER_ASSETS.map(x=>'/'+x);
   if(missing)assert.ok(optional.every(x=>!before.keys.includes(x)),
    'incomplete optional bundle must not leave partial cache');
   else for(const x of optional)assert.ok(before.keys.includes(x),'missing optional '+x);
   assert.deepEqual(errors,[],'online page errors');

   // The origin is physically gone, not simulated with a request interceptor.
   await new Promise(ok=>server.close(ok));
   const count=requested.length;
   await page.goto(origin+'/index.html',{waitUntil:'load',timeout:30000});
   const app=await page.evaluate(()=>({
    controlled:!!navigator.serviceWorker.controller,
    chat:!!document.querySelector('#log'),send:!!document.querySelector('#send'),
    title:document.title
   }));
   assert.ok(app.controlled&&app.chat&&app.send,'normal app failed after offline restart');
   if(!missing){
    await page.addScriptTag({url:origin+'/modules/genesis-x-worker-client.js'});
    const result=await page.evaluate(t=>window.NERYXGenesisXWorkerClient.preview(t),task());
    assert.equal(result.status,'review_required');
    assert.equal(result.checkedCases,2);
    assert.equal(result.publishable,false);
    assert.equal(result.referenceCases,0);
    assert.equal(result.cases,undefined);
    const main=await page.evaluate(()=>({
     research:typeof window.NERYXGenesisXResearchLab,
     chain:typeof window.NERYXGenesisXChain,
     storage:localStorage.length
    }));
    assert.equal(main.research,'undefined');
    assert.equal(main.chain,'undefined');
    assert.equal(main.storage,0);
   }else{
    const clientCached=before.keys.includes('/modules/genesis-x-worker-client.js');
    assert.equal(clientCached,false);
   }
   assert.equal(requested.length,count,'network requests after physical origin shutdown');
   assert.deepEqual(errors,[],'offline page errors');
   console.log('NERYX_REAL_SW_OVERLAY_OFFLINE_OK '+JSON.stringify({
    browser:browserName,missingOptional:missing,app,
    totalCached:before.keys.length,experimentalCached:optional.filter(x=>before.keys.includes(x)).length,
    workerStatus:missing?'not enabled':'review_required'
   }));
  }finally{
   if(context)await context.close();
   if(server.listening)await new Promise(ok=>server.close(ok));
  }
 }
}finally{if(browser)await browser.close();}

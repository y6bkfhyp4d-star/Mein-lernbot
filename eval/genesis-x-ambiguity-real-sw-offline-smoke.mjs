/* Real app SW in-memory overlay: cold-offline ambiguity Worker + optional fail-safe. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import {makeAmbiguityOverlay,GENESIS_AMBIGUITY_ASSETS} from './genesis-x-ambiguity-sw-overlay.mjs';

const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unsupported browser');
const root=resolve('.'),original=await readFile(resolve(root,'sw.js'),'utf8');
const overlay=makeAmbiguityOverlay(original);
assert.ok(!original.includes('GENESIS_PREVIEW_ASSETS'),'production SW must be unchanged');
assert.ok(overlay.includes("const CACHE='neryx-offline-v4';"));
assert.equal(GENESIS_AMBIGUITY_ASSETS.length,16);
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.webmanifest':'application/manifest+json','.png':'image/png'};
const task=fn=>({training:[-3,-1,0].map(x=>({x,y:fn(x)})),
 validation:[1,3].map(x=>({x,y:fn(x)})),probes:[-6,4,7.5]});
const ambiguous=()=>({training:[0,1e-10,2e-10].map(x=>({x,y:2+x})),
 validation:[3e-10,4e-10].map(x=>({x,y:2+x})),probes:[10,-10]});
let browser;
try{
 browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
 for(const missing of [false,true]){
  const requested=[];
  const server=createServer(async(req,res)=>{
   const path=new URL(req.url,'http://127.0.0.1').pathname;
   requested.push(path);
   if(path==='/sw.js'){
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
    res.end(overlay);return;
   }
   if(missing&&path==='/modules/genesis-x-ambiguity-gate.js'){
    res.writeHead(404);res.end('intentionally unavailable optional module');return;
   }
   try{
    const file=resolve(root,'.'+decodeURIComponent(path));
    if(!file.startsWith(root+sep))throw Error('Out of scope');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream',
     'Cache-Control':'no-store'});
    res.end(await readFile(file));
   }catch{res.writeHead(404);res.end('not found');}
  });
  let context;
  try{
   await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes)});
   const origin='http://127.0.0.1:'+server.address().port;
   context=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844},
    ...(browserName==='webkit'?{isMobile:true,hasTouch:true}:{})});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/index.html',{waitUntil:'load',timeout:30000});
   await page.evaluate(async()=>Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_,reject)=>setTimeout(()=>reject(Error('SW timeout')),16000))
   ]));
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
   const cached=await page.evaluate(async()=>({
    paths:(await(await caches.open('neryx-offline-v4')).keys())
     .map(req=>new URL(req.url).pathname),
    keys:await caches.keys()
   }));
   const optional=GENESIS_AMBIGUITY_ASSETS.map(x=>'/'+x);
   for(const basic of ['/index.html','/app.js','/modules/orchestrator.js'])
    assert.ok(cached.paths.includes(basic),'App shell missing '+basic);
   assert.equal(cached.paths.length,missing?42:58,'Unexpected bundle size');
   assert.equal(optional.filter(x=>cached.paths.includes(x)).length,missing?0:16);
   assert.equal(cached.keys.includes('neryx-offline-v4'),true);
   assert.deepEqual(errors,[]);
   await new Promise(done=>server.close(done));
   const count=requested.length;
   await page.goto(origin+'/index.html',{waitUntil:'load',timeout:30000});
   const app=await page.evaluate(()=>({
    chat:!!document.querySelector('#log'),
    send:!!document.querySelector('#send'),
    controlled:!!navigator.serviceWorker.controller,
    title:document.title
   }));
   assert.ok(app.chat&&app.send&&app.controlled);
   if(!missing){
    await page.addScriptTag({url:origin+'/modules/genesis-x-ambiguity-client.js'});
    const result=await page.evaluate(async({clear,unclear})=>{
     const api=window.NERYXGenesisXAmbiguityClient;
     const consistent=await api.inspect(clear);
     const ambiguous=await api.inspect(unclear);
     return {consistent,ambiguous,
      globals:[typeof window.NERYXGenesisXTools,typeof window.NERYXGenesisXAmbiguityGate],
      storage:localStorage.length,
      apiKeys:Object.keys(api)};
    },{clear:task(x=>x*x+2),unclear:ambiguous()});
    assert.equal(result.consistent.status,'review_required');
    assert.equal(result.consistent.distinctProbeBehaviors,1);
    assert.equal(result.ambiguous.status,'ambiguous');
    assert.ok(result.ambiguous.distinctProbeBehaviors>1);
    for(const value of [result.ambiguous,result.consistent]){
     assert.equal(value.publishable,false);
     assert.equal(value.program,undefined);
     assert.equal(value.predictions,undefined);
    }
    assert.deepEqual(result.globals,['undefined','undefined']);
    assert.deepEqual(result.apiKeys,['version','inspect']);
    assert.equal(result.storage,0);
   }else assert.equal(cached.paths.includes('/modules/genesis-x-ambiguity-client.js'),false);
   assert.equal(requested.length,count,'No requests allowed after server shutdown');
   assert.deepEqual(errors,[]);
   console.log('GENESIS_X_AMBIGUITY_REAL_SW_OFFLINE_OK '+JSON.stringify({
    browser:browserName,missingOptional:missing,app,
    cachedAssets:cached.paths.length,researchAssets:optional.filter(x=>cached.paths.includes(x)).length,
    researchStatus:missing?'not enabled':'review_required & ambiguous',
    zeroNetworkRequestsAfterShutdown:true
   }));
  }finally{
   if(context)await context.close();
   if(server.listening)await new Promise(done=>server.close(done));
  }
 }
}finally{if(browser)await browser.close();}

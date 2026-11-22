/* Real Chromium/WebKit opt-in Worker boundary: ambiguity, nonpublish and failure. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';

const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unknown browser');
const root=resolve('.');
const allowed=new Set([
 '/modules/genesis-x-tools.js','/modules/genesis-x-ambiguity-gate.js',
 '/modules/genesis-x-ambiguity-worker.js','/modules/genesis-x-ambiguity-client.js'
]);
let broken=false;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path==='/test.html'){
  res.writeHead(200,{'Content-Type':'text/html'});
  res.end('<!doctype html><title>GENESIS X ambiguity worker test</title>');return;
 }
 if(!allowed.has(path)||(broken&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('missing');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('out of scope');
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('not found');}
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(browserName==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/test.html');
 await page.addScriptTag({url:origin+'/modules/genesis-x-ambiguity-client.js'});
 const checked=await page.evaluate(async()=>{
  const api=window.NERYXGenesisXAmbiguityClient;
  const make=(fn,xs,ys,probes)=>({
   training:xs.map(x=>({x,y:fn(x)})),
   validation:ys.map(x=>({x,y:fn(x)})),probes
  });
  const ambiguous=await api.inspect(make(x=>x+2,[0,1e-10,2e-10],[3e-10,4e-10],[10,-10]));
  const consistent=await api.inspect(make(x=>x*x+2,[-3,-1,0],[1,3],[-6,4,7.5]));
  const invalid=await api.inspect(null);
  const corrupted=await api.inspect(make(x=>x+2,[0,1,2],[4,7],[4]));
  return {ambiguous,consistent,invalid,corrupted,
   scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
   mainGlobals:[typeof window.NERYXGenesisXTools,typeof window.NERYXGenesisXAmbiguityGate],
   storage:localStorage.length,
   apiKeys:Object.keys(api)};
 });
 assert.equal(checked.ambiguous.status,'ambiguous');
 assert.ok(checked.ambiguous.distinctProbeBehaviors>1);
 assert.equal(checked.consistent.status,'review_required');
 assert.equal(checked.consistent.distinctProbeBehaviors,1);
 assert.equal(checked.invalid.status,'invalid');
 assert.equal(checked.corrupted.status,'invalid');
 for(const r of [checked.ambiguous,checked.consistent,checked.invalid,checked.corrupted]){
  assert.equal(r.publishable,false);
  assert.equal(r.program,undefined);
  assert.equal(r.predictions,undefined);
  assert.equal(r.value,undefined);
 }
 assert.deepEqual(checked.scripts,['/modules/genesis-x-ambiguity-client.js']);
 assert.deepEqual(checked.mainGlobals,['undefined','undefined']);
 assert.deepEqual(checked.apiKeys,['version','inspect']);
 assert.equal(checked.storage,0);
 broken=true;
 await page.reload({waitUntil:'load'});
 await page.addScriptTag({url:origin+'/modules/genesis-x-ambiguity-client.js'});
 const blocked=await page.evaluate(()=>window.NERYXGenesisXAmbiguityClient.inspect({
  training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],
  validation:[{x:4,y:6},{x:7,y:9}],probes:[10]}));
 assert.equal(blocked.status,'blocked');
 assert.equal(blocked.publishable,false);
 assert.deepEqual(errors,[]);
 console.log('GENESIS_X_AMBIGUITY_WORKER_OK '+JSON.stringify({
  browser:browserName,ambiguous:checked.ambiguous.status,
  consistent:checked.consistent.status,missingWorker:blocked.status,
  storage:checked.storage,allNonpublishable:true}));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

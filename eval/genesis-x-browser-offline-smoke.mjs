/* Browser-only, isolated GENESIS X offline test. No NERYX production script. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';

const engine=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unsupported browser '+engine);
const modules=[
 'genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js'
];
const root=resolve('.'),requests=[];
const server=createServer(async(req,res)=>{
 requests.push(req.url);
 if(req.url==='/isolated-test.html'){
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>GENESIS X test only</body></html>');
  return;
 }
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
  if(!modules.includes(path.replace(/^modules\//,''))||!path.startsWith('modules/'))throw Error('unlisted');
  const file=resolve(root,path);
  if(!file.startsWith(root+sep))throw Error('outside root');
  res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('not found')}
});
const numeric=(offset=2)=>({
 training:[0,1,2].map(x=>({x,y:x+offset})),
 validation:[4,7].map(x=>({x,y:x+offset})),maxSteps:1
});
const logic=()=>({
 training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))
});
const task=(offset=2)=>({numeric:numeric(offset),logic:logic(),cases:[{x:3,b:4},{x:8,b:20}]});
const audit=()=>[-3,11,20,30].map((x,i)=>{const b=[1,50,12,50][i],value=x+5;return{x,b,truth:{value,decision:value>b}}});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(engine==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 // Explicitly forbid external requests, including CDNs, to keep dependencies local.
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort('blockedbyclient');
  return route.continue();
 });
 await page.goto(origin+'/isolated-test.html',{waitUntil:'load'});
 for(const name of modules)
  await page.addScriptTag({url:origin+'/modules/'+name});
 const initial=await page.evaluate(()=>({
  title:document.title,
  capabilities:window.NERYXGenesisXResearchLab.capabilities(),
  appLoaded:typeof window.NERYXOrchestrator!=='undefined',
  localStoreLength:localStorage.length,
  SWCount:typeof navigator.serviceWorker==='undefined'?'unsupported':'present'
 }));
 assert.equal(initial.capabilities.length,9);
 assert.ok(initial.capabilities.every(c=>c.available));
 assert.equal(initial.appLoaded,false);
 assert.equal(initial.localStoreLength,0);
 assert.deepEqual(pageErrors,[]);
 const beforeOffline=requests.length;
 // Close the origin entirely to verify execution no longer needs a server;
 // WebKit/Linux can be unreliable with context.setOffline().
 await new Promise(ok=>server.close(ok));
 const checks=await page.evaluate(({numeric,logic,task,audit})=>{
  const w=window,lab=w.NERYXGenesisXResearchLab;
  const checked=lab.run({mode:'checked',input:task});
  const unchecked=lab.run({mode:'chain',input:task});
  const invalid=w.NERYXGenesisXVerifier.verify(null);
  const sparse=w.NERYXGenesisXVerifier.verify({
   program:[{op:'add',c:2}],
   rule:{kind:'atom',field:'a',op:'gt',target:'field',other:'b'},
   cases:[{x:3,b:4},,],claims:[{value:5,decision:true},,]
  });
  const researchTask={...task,numeric:numeric,logic};
  const request={mode:'research',input:{task:researchTask,audit}};
  const one=lab.run(request),again=lab.run(request);
  return{
   checked:checked.status,checkedPublished:checked.publishable,checks:checked.report?.audit?.checked,
   unchecked:unchecked.status,uncheckedCases:unchecked.report?.cases,
   invalid:invalid.status,sparse:sparse.status,
   research:one.status,repeated:again.status,reuseReason:again.report?.reason,
   appLoaded:typeof w.NERYXOrchestrator!=='undefined',
   storageSize:localStorage.length,
   scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname)
  };
 },{numeric:numeric(5),logic:logic(),task:task(2),audit:audit()});
 assert.equal(checks.checked,'execution_checked');
 assert.equal(checks.checkedPublished,false);
 assert.equal(checks.checks,2);
 assert.equal(checks.unchecked,'exploration_only');
 assert.equal(checks.uncheckedCases,undefined);
 assert.equal(checks.invalid,'invalid');
 assert.equal(checks.sparse,'invalid');
 assert.equal(checks.research,'coverage_gain_observed');
 assert.equal(checks.repeated,'blocked');
 assert.equal(checks.reuseReason,'audit_reuse');
 assert.equal(checks.appLoaded,false);
 assert.equal(checks.storageSize,0);
 assert.equal(checks.scripts.length,modules.length);
 assert.equal(requests.length,beforeOffline);
 assert.deepEqual(pageErrors,[]);
 console.log('GENESIS_X_ISOLATED_OFFLINE_BROWSER_OK '+JSON.stringify({engine,requests:requests.length,checks}));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

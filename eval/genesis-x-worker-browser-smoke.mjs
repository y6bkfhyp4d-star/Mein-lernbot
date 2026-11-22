/* Real-browser isolation test for the optional GENESIS X worker protocol. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';
const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unknown engine');
const names=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js','genesis-x-research.js',
 'genesis-x-research-lab.js','genesis-x-integration-preview.js',
 'genesis-x-worker.js','genesis-x-worker-client.js'];
const root=resolve('.'),requests=[];
const server=createServer(async(req,res)=>{
 requests.push(req.url);
 if(req.url==='/test.html'){
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
  res.end('<!doctype html><title>GENESIS X worker test only</title><body>Isolated</body>');
  return;
 }
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  if(!p.startsWith('modules/')||!names.includes(p.slice(8)))throw Error('unlisted');
  const f=resolve(root,p);
  if(!f.startsWith(root+sep))throw Error('path');
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
  res.end(await readFile(f));
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
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(browserName==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==origin)return route.abort('blockedbyclient');
  return route.continue();
 });
 await page.goto(origin+'/test.html');
 await page.addScriptTag({url:origin+'/modules/genesis-x-worker-client.js'});
 const result=await page.evaluate(async t=>{
  const client=window.NERYXGenesisXWorkerClient;
  const ok=await client.preview(t);
  const invalid=await client.preview(null);
  const broken=await client.preview({...t,cases:[,{x:8,b:20}]});
  const falseRef=structuredClone(t);
  falseRef.cases[0].truth={value:999,decision:true};
  const mismatch=await client.preview(falseRef);
  const truth=structuredClone(t);
  truth.cases[0].truth={value:5,decision:true};
  truth.cases[1].truth={value:10,decision:false};
  const matched=await client.preview(truth);
  return {ok,invalid,broken,mismatch,matched,
   mainGlobals:[typeof window.NERYXGenesisXChain,typeof window.NERYXGenesisXVerifier,
                typeof window.NERYXGenesisXIntegrationPreview],
   clientKeys:Object.keys(client),storage:localStorage.length,
   scripts:[...document.scripts].filter(x=>x.src).map(x=>new URL(x.src).pathname)};
 },task());
 assert.equal(result.ok.status,'review_required');
 assert.equal(result.ok.publishable,false);
 assert.equal(result.ok.checkedCases,2);
 assert.equal(result.ok.referenceCases,0);
 assert.equal(result.ok.cases,undefined);
 assert.equal(result.invalid.status,'invalid');
 assert.equal(result.broken.status,'blocked'); // Sparse array may be rejected by worker after cloning.
 assert.equal(result.mismatch.status,'blocked');
 assert.equal(result.matched.status,'review_required');
 assert.equal(result.matched.referenceCases,2);
 assert.equal(result.matched.allReferencesMatched,true);
 assert.deepEqual(result.mainGlobals,['undefined','undefined','undefined']);
 assert.deepEqual(result.clientKeys,['version','preview']);
 assert.equal(result.storage,0);
 assert.deepEqual(result.scripts,['/modules/genesis-x-worker-client.js']);
 assert.deepEqual(errors,[]);
 assert.ok(requests.includes('/modules/genesis-x-worker.js'));
 for(const name of names.filter(n=>n!=='genesis-x-worker-client.js'))
  if(name!=='genesis-x-worker.js')assert.ok(requests.includes('/modules/'+name),'missing worker import '+name);
 console.log('GENESIS_X_WORKER_BOUNDARY_OK '+JSON.stringify({browser:browserName,requests:requests.length,good:result.ok,matched:result.matched}));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

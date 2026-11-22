/* Real research-only routed page + GENESIS Worker in Chromium and WebKit. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unsupported browser');
const root=resolve('.');
const allowed=new Set([
 '/eval/neryx-genesis-x-routed-research.html',
 '/eval/neryx-genesis-x-routed-research.js',
 '/eval/neryx-genesis-x-routed-ui.js',
 '/modules/orchestrator.js',
 '/modules/genesis-x-ambiguity-client.js',
 '/modules/genesis-x-ambiguity-worker.js',
 '/modules/genesis-x-ambiguity-gate.js',
 '/modules/genesis-x-tools.js',
 '/modules/neryx-genesis-x-research-bridge.js'
]);
let workerUnavailable=false,requests=0;
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname;requests++;
 if(req.method!=='GET'||!allowed.has(path)||(workerUnavailable&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('missing');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('Outside project');
  res.writeHead(200,{'Content-Type':extname(path)==='.html'?'text/html':'text/javascript',
   'Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('not found');}
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(browserName==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/eval/neryx-genesis-x-routed-research.html',{waitUntil:'load'});
 const submit=async text=>{
  await page.locator('#routed-question').fill(text);
  await page.locator('#routed-submit').click();
 };
 const check=async text=>{
  await page.waitForFunction(expected=>document.getElementById('routed-result')?.textContent.includes(expected),
   text,{timeout:13000});
  const out=await page.locator('#routed-result').textContent();
  assert.match(out,/Keine Antwort freigegeben/);
  assert.doesNotMatch(out,/selectedProgram|\bpredictions\b|publishable|competingPrograms/i);
 };
 await submit('GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10');
 await check('Interne Regelprüfung durchgeführt');
 await submit('GENESIS prüfen: 0=2, 0.0000000001=2.0000000001, 0.0000000002=2.0000000002, 0.0000000003=2.0000000003, 0.0000000004=2.0000000004; 10');
 await check('Mehrdeutigkeit erkannt');
 await submit('GENESIS prüfen: 0=2, 1=3, 2=4, 4=999, 7=9; 10');
 await check('Keine passende Rechenregel bestätigt');
 const before=requests;
 await submit('GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 7');
 await check('Format ungültig');
 assert.equal(requests,before,'Invalid input never contacts a Worker');
 const inspected=await page.evaluate(()=>({
  storage:localStorage.length,
  globals:[typeof window.NERYXLocalModel,typeof window.LernBotBridge,
   typeof window.NERYXGenesisXTools,typeof window.NERYXGenesisXAmbiguityGate],
  scripts:[...document.scripts].filter(x=>x.src).map(x=>new URL(x.src).pathname),
  enabled:!document.getElementById('routed-submit').disabled
 }));
 assert.equal(inspected.storage,0);
 assert.deepEqual(inspected.globals,['undefined','undefined','undefined','undefined']);
 assert.equal(inspected.enabled,true);
 assert.deepEqual(inspected.scripts,[
  '/modules/orchestrator.js','/modules/genesis-x-ambiguity-client.js',
  '/modules/neryx-genesis-x-research-bridge.js',
  '/eval/neryx-genesis-x-routed-research.js',
  '/eval/neryx-genesis-x-routed-ui.js'
 ]);
 workerUnavailable=true;
 await page.reload({waitUntil:'load'});
 await page.locator('#routed-submit').click();
 await check('Forschungsprüfung blockiert');
 assert.deepEqual(errors,[]);
 console.log('NERYX_GENESIS_X_ROUTED_RESEARCH_OK '+JSON.stringify({
  browser:browserName,validCases:3,invalidLocal:1,workerMissing:'blocked',
  noStorage:true,noQwen:true,noMainChat:true,allNonpublishable:true
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

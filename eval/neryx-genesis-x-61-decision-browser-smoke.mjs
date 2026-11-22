/* #61 real Chromium + Linux WebKit test, actual GENESIS Worker, no model. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const name=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(name))throw Error('Unsupported browser');
const root=resolve('.');
const allowed=new Set([
 '/eval/neryx-genesis-x-61-decision.html',
 '/eval/neryx-genesis-x-61-decision-gate.js',
 '/eval/neryx-genesis-x-61-decision-ui.js',
 '/eval/neryx-genesis-x-routed-research.js',
 '/modules/math-verifier.js','/modules/orchestrator.js',
 '/modules/genesis-x-ambiguity-client.js',
 '/modules/genesis-x-ambiguity-worker.js',
 '/modules/genesis-x-ambiguity-gate.js',
 '/modules/genesis-x-tools.js',
 '/modules/neryx-genesis-x-research-bridge.js'
]);
let broken=false,requests=0;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;requests++;
 if(req.method!=='GET'||!allowed.has(path)||
   (broken&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('unavailable');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('Out of bounds');
  res.writeHead(200,{'Content-Type':extname(path)==='.html'?'text/html':'text/javascript',
   'Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('missing');}
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(name==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/eval/neryx-genesis-x-61-decision.html',{waitUntil:'load'});
 const run=async(key,needle)=>{
  await page.locator('[data-case="'+key+'"]').click();
  await page.locator('#check').click();
  await page.waitForFunction(v=>document.getElementById('decision-result')?.textContent.includes(v),needle,{timeout:13000});
  return page.locator('#decision-result').textContent();
 };
 const a=await run('area','150 m²');
 assert.match(a,/Nur für diesen begrenzten Aufgabentyp geprüft/);
 const b=await run('ambiguous','Mehrdeutigkeit erkannt');
 assert.match(b,/Keine GENESIS-X-Antwort freigegeben/);
 assert.doesNotMatch(b,/150 m²/);
 const c=await run('contradiction','Keine passende Rechenregel bestätigt');
 assert.match(c,/Keine Antwort freigegeben/);
 const d=await run('unknown','keine unabhängig überprüfte Lösung');
 assert.match(d,/Qwen wird hier nicht aufgerufen/);
 const checked=await page.evaluate(()=>({
  storage:localStorage.length,
  scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
  chat:!!document.getElementById('log'),
  globals:[typeof window.NERYXLocalModel,typeof window.LernBotBridge,
   typeof window.NERYXGenesisXTools,typeof window.NERYXGenesisXAmbiguityGate],
  enabled:!document.getElementById('check').disabled
 }));
 assert.equal(checked.storage,0);assert.equal(checked.chat,false);
 assert.deepEqual(checked.globals,['undefined','undefined','undefined','undefined']);
 assert.equal(checked.enabled,true);
 assert.deepEqual(checked.scripts,[
  '/modules/math-verifier.js','/modules/orchestrator.js',
  '/modules/genesis-x-ambiguity-client.js',
  '/modules/neryx-genesis-x-research-bridge.js',
  '/eval/neryx-genesis-x-routed-research.js',
  '/eval/neryx-genesis-x-61-decision-gate.js',
  '/eval/neryx-genesis-x-61-decision-ui.js'
 ]);
 const before=requests;
 await page.locator('#decision-question').fill('GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 7');
 await page.locator('#check').click();
 await page.waitForFunction(()=>document.getElementById('decision-result')?.textContent.includes('Ungültiges Eingabeformat'));
 assert.equal(requests,before,'invalid input cannot send worker requests');
 broken=true;
 await page.reload({waitUntil:'load'});
 await page.locator('[data-case="ambiguous"]').click();
 await page.locator('#check').click();
 await page.waitForFunction(()=>document.getElementById('decision-result')?.textContent.includes('blockiert'),null,{timeout:13000});
 assert.deepEqual(errors,[]);
 console.log('GENESIS_X_61_EVIDENCE_BROWSER_OK '+JSON.stringify({
  browser:name,cases:4,invalidInput:'rejected',missingWorker:'blocked',
  privateStorage:0,chat:false,model:false
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

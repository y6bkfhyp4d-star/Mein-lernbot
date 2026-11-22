/* Browser E2E: custom numeric examples, validation and nonpublication. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const name=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(name))throw Error('Unsupported browser');
const root=resolve('.');
const allow=new Set([
 '/eval/neryx-genesis-x-custom-input.html',
 '/eval/neryx-genesis-x-custom-input-ui.js',
 '/modules/neryx-genesis-x-research-bridge.js',
 '/modules/genesis-x-ambiguity-client.js',
 '/modules/genesis-x-ambiguity-worker.js',
 '/modules/genesis-x-ambiguity-gate.js',
 '/modules/genesis-x-tools.js'
]);
let unavailable=false,requests=0;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;requests++;
 if(req.method!=='GET'||!allow.has(path)||
   (unavailable&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('unavailable');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('Not allowed');
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
 const url='http://127.0.0.1:'+server.address().port+'/eval/neryx-genesis-x-custom-input.html';
 await page.goto(url,{waitUntil:'load'});
 assert.match(await page.title(),/GENESIS X/);
 assert.equal(await page.locator('a[href="../index.html"]').count(),1);
 const set=async(training,validation,probes)=>{
  await page.locator('#training').fill(training);
  await page.locator('#validation').fill(validation);
  await page.locator('#probes').fill(probes);
  await page.locator('#custom-run').click();
 };
 const check=async(match)=>{
  await page.waitForFunction(expected=>document.querySelector('#custom-result')?.textContent.includes(expected),
   match,{timeout:13000});
  const result=await page.locator('#custom-result').textContent();
  assert.match(result,/Keine Antwort freigegeben/);
  assert.doesNotMatch(result,/\b(?:program|selected|candidates|publishable|predictions)\b/i);
 };
 // All inputs below are entered in user-controlled text boxes, not fixed presets.
 await set('-3;11\n-1;3\n0;2','1;3\n3;11','-6\n4');
 await check('Interne Prüfung abgeschlossen');
 await set('0;2\n0,0000000001;2,0000000001\n0,0000000002;2,0000000002',
  '0,0000000003;2,0000000003\n0,0000000004;2,0000000004','10\n-10');
 await check('Mehrdeutigkeit erkannt');
 await set('0;2\n1;3\n2;4','4;999\n7;9','10');
 await check('Keine passende Rechenregel bestätigt');
 // Custom decimal commas with ordinary valid distinct points.
 await set('-3,5;14,25\n-1;3\n0;2','1;3\n3;11','-6\n4');
 await check('Interne Prüfung abgeschlossen');
 // Reject malformed, duplicates and bounds locally without firing worker requests.
 const negatives=[
  ['0;2\n0;3\n2;4','4;6\n7;9','10'],
  ['0;2\n1;3\n2;4','4;6\n7;9','7'],
  ['0;2\n1;3\n2;4','4;6\n7;9','NaN'],
  ['0;2\n1;3\n2;4','4;6\n7;9','10\n10'],
  ['0;2\n1;3\n2;4','4;6\n7;9','1000001'],
  ['0;2\n1;3\n2;4','4;6\n7;9','10\n']
 ];
 for(const args of negatives.slice(0,5)){
  const before=requests;
  await set(...args);
  await check('Ungültige Forschungsdaten');
  assert.equal(requests,before,'Invalid input must never be sent to a worker');
 }
 const state=await page.evaluate(()=>({
  storage:localStorage.length,
  scripts:[...document.scripts].filter(x=>x.src).map(x=>new URL(x.src).pathname),
  noEngineGlobals:typeof window.NERYXGenesisXTools==='undefined'&&
   typeof window.NERYXGenesisXAmbiguityGate==='undefined',
  chat:!!document.querySelector('#log'),
  buttonDisabled:document.querySelector('#custom-run').disabled
 }));
 assert.equal(state.storage,0);
 assert.equal(state.noEngineGlobals,true);
 assert.equal(state.chat,false);
 assert.equal(state.buttonDisabled,false);
 assert.deepEqual(state.scripts,[
  '/modules/genesis-x-ambiguity-client.js',
  '/modules/neryx-genesis-x-research-bridge.js',
  '/eval/neryx-genesis-x-custom-input-ui.js'
 ]);
 unavailable=true;
 await page.reload({waitUntil:'load'});
 await page.locator('#custom-run').click();
 await check('Prüfung blockiert');
 assert.deepEqual(errors,[]);
 console.log('NERYX_GENESIS_X_CUSTOM_INPUT_OK '+JSON.stringify({
  browser:name,passedValidCases:4,rejectedInvalidCases:5,
  absentWorker:'blocked',localStorage:state.storage,noChatAccess:true
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

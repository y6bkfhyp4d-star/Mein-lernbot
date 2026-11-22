/* Browser smoke: opt-in typed NERYX->GENESIS research bridge, never chat. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unknown browser');
const root=resolve('.');
const allowed=new Set([
 '/eval/neryx-genesis-x-bridge-demo.html',
 '/eval/neryx-genesis-x-bridge-demo.js',
 '/modules/neryx-genesis-x-research-bridge.js',
 '/modules/genesis-x-ambiguity-client.js',
 '/modules/genesis-x-ambiguity-worker.js',
 '/modules/genesis-x-ambiguity-gate.js',
 '/modules/genesis-x-tools.js'
]);
let denyWorker=false;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(req.method!=='GET'||!allowed.has(path)||
    (denyWorker&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('missing');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('Path outside scope');
  res.writeHead(200,{'Content-Type':extname(path)==='.html'?'text/html':'text/javascript','Cache-Control':'no-store'});
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
 await page.goto(origin+'/eval/neryx-genesis-x-bridge-demo.html',{waitUntil:'load'});
 assert.match(await page.title(),/NERYX.*GENESIS X/);
 assert.equal(await page.locator('a[href="../index.html"]').count(),1);
 const states=[];
 for(const [value,expected] of [
  ['unique','Intern geprüft'],
  ['ambiguous','Mehrdeutigkeit erkannt'],
  ['contradictory','Keine Regel bestätigt']
 ]){
  await page.locator('#bridge-case').selectOption(value);
  await page.locator('#bridge-run').click();
  await page.waitForFunction(phrase=>document.getElementById('bridge-result')?.textContent.includes(phrase),
   expected,{timeout:14000});
  const output=await page.locator('#bridge-result').textContent();
  assert.match(output,/Keine Antwort freigegeben/);
  assert.doesNotMatch(output,/\\b(?:selected|predictions|candidates|publishable|program)\\b/i);
  states.push(value);
 }
 const details=await page.evaluate(()=>({
  storage:localStorage.length,
  scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
  noEngineGlobals:typeof window.NERYXGenesisXTools==='undefined'&&
   typeof window.NERYXGenesisXAmbiguityGate==='undefined',
  bridgeApi:Object.keys(window.NERYXGenesisXResearchBridge),
  hasChat:!!document.querySelector('#log'),
  buttonDisabled:document.getElementById('bridge-run').disabled
 }));
 assert.equal(details.storage,0);
 assert.deepEqual(details.scripts,[
  '/modules/genesis-x-ambiguity-client.js',
  '/modules/neryx-genesis-x-research-bridge.js',
  '/eval/neryx-genesis-x-bridge-demo.js'
 ]);
 assert.equal(details.noEngineGlobals,true);
 assert.deepEqual(details.bridgeApi,['version','review']);
 assert.equal(details.hasChat,false);
 assert.equal(details.buttonDisabled,false);

 denyWorker=true;
 await page.reload({waitUntil:'load'});
 await page.locator('#bridge-run').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-result')?.textContent.includes('Prüfung blockiert'),
  null,{timeout:14000});
 assert.match(await page.locator('#bridge-result').textContent(),/Keine Antwort freigegeben/);
 assert.deepEqual(errors,[]);
 console.log('NERYX_GENESIS_X_RESEARCH_BRIDGE_UI_OK '+JSON.stringify({
  browser:browserName,scenarios:states,missingWorker:'blocked',
  storage:details.storage,engineIsolated:true,chatUnchanged:true
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

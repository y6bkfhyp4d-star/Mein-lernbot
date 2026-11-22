/* Browser test of opt-in NERYX-branded GENESIS X preview, no main chat routing. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const browserName=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(browserName))throw Error('Unknown browser');
const root=resolve('.');
const allowed=new Set([
 '/eval/genesis-x-ambiguity-preview.html',
 '/eval/genesis-x-ambiguity-preview-ui.js',
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
  res.writeHead(404);res.end('not found');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('outside repository');
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
 await page.goto(origin+'/eval/genesis-x-ambiguity-preview.html',{waitUntil:'load'});
 assert.match(await page.title(),/NERYX.*GENESIS X/);
 assert.equal(await page.locator('a[href="../index.html"]').count(),1);
 const results=[];
 for(const [value,expected] of [
  ['unique','Interne Prüfung abgeschlossen'],
  ['ambiguous','Mehrdeutigkeit erkannt'],
  ['contradictory','Keine passende Regel bestätigt']
 ]){
  await page.locator('#scenario').selectOption(value);
  await page.locator('#check').click();
  await page.waitForFunction(expected=>{
   const text=document.getElementById('result')?.textContent||'';
   return text.includes(expected);
  },expected,{timeout:14000});
  const output=await page.locator('#result').textContent();
  assert.match(output,/Keine Antwort freigegeben|keine Antwort freigegeben|Keine Lösung freigegeben/);
  assert.doesNotMatch(output,/\b(?:program|predictions|selected|publishable|candidates)\b/i);
  results.push(value);
 }
 const state=await page.evaluate(()=>({
  storage:localStorage.length,
  researchGlobals:[typeof window.NERYXGenesisXTools,typeof window.NERYXGenesisXAmbiguityGate],
  appGlobals:[typeof window.LernBotBridge],
  scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
  buttonDisabled:document.getElementById('check').disabled
 }));
 assert.equal(state.storage,0);
 assert.deepEqual(state.researchGlobals,['undefined','undefined']);
 assert.deepEqual(state.appGlobals,['undefined']);
 assert.deepEqual(state.scripts,[
  '/modules/genesis-x-ambiguity-client.js','/eval/genesis-x-ambiguity-preview-ui.js']);
 assert.equal(state.buttonDisabled,false);
 denyWorker=true;
 await page.reload({waitUntil:'load'});
 await page.locator('#check').click();
 await page.waitForFunction(()=>document.querySelector('#result')?.textContent.includes('Prüfung blockiert'),null,{timeout:15000});
 assert.match(await page.locator('#result').textContent(),/Keine Antwort freigegeben/);
 assert.deepEqual(errors,[]);
 console.log('GENESIS_X_OPTIONAL_PREVIEW_UI_OK '+JSON.stringify({
  browser:browserName,scenarios:results,missingWorker:'blocked',
  mainAppUnchanged:true,storage:state.storage
 }));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

/* Real-browser isolated one-case review interface checks. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';

const engine=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(engine))throw Error('Unknown browser');
const root=resolve('.');
const modules=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js',
 'genesis-x-integration-preview.js','genesis-x-worker.js',
 'genesis-x-worker-client.js'].map(n=>'/modules/'+n);
const allowed=new Set(['/eval/genesis-x-task-demo.html','/eval/genesis-x-task-ui.js',...modules]);
let failWorker=false;
const requests=[];
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 requests.push(pathname);
 if(!allowed.has(pathname)||req.method!=='GET'||
    failWorker&&pathname==='/modules/genesis-x-worker.js'){
  res.writeHead(404);res.end('not found');return;
 }
 try{
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))throw Error('out of root');
  res.writeHead(200,{'Content-Type':pathname.endsWith('.html')?'text/html':'text/javascript',
   'Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('missing');}
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},
  ...(engine==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/eval/genesis-x-task-demo.html',{waitUntil:'load'});
 assert.match(await page.locator('#report').textContent(),/Noch keine Prüfung/);
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('Interne Ausführung geprüft'),null,{timeout:15000});
 const checked=await page.locator('#report').textContent();
 assert.match(checked,/Keine unabhängigen Referenzdaten/);
 assert.match(checked,/keine Antwort freigegeben/i);
 assert.doesNotMatch(checked,/Ergebnis:\s*5|Entscheidung:\s*true/);

 await page.locator('#x').fill('1000001');
 await page.locator('#run').click();
 assert.equal(await page.locator('#report').textContent(),checked,
  'native invalid form cannot submit or change the previous report');
 await page.locator('#x').fill('');
 await page.locator('#run').click();
 assert.equal(await page.locator('#report').textContent(),checked);

 // A page refresh followed by a worker script failure must fail closed.
 failWorker=true;
 await page.reload({waitUntil:'load'});
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('Prüfung blockiert'),null,{timeout:15000});
 const blocked=await page.locator('#report').textContent();
 assert.match(blocked,/Kein Ergebnis freigegeben/);
 const state=await page.evaluate(()=>({
  scripts:[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname),
  researchGlobals:[typeof window.NERYXGenesisXResearchLab,
                   typeof window.NERYXGenesisXIntegrationPreview,
                   typeof window.NERYXGenesisXChain],
  storage:localStorage.length,
  disabled:document.getElementById('run').disabled,
  clientKeys:Object.keys(window.NERYXGenesisXWorkerClient)
 }));
 assert.deepEqual(state.scripts,['/modules/genesis-x-worker-client.js','/eval/genesis-x-task-ui.js']);
 assert.deepEqual(state.researchGlobals,['undefined','undefined','undefined']);
 assert.equal(state.storage,0);
 assert.equal(state.disabled,false);
 assert.deepEqual(state.clientKeys,['version','preview']);
 assert.deepEqual(errors,[]);
 assert.ok(requests.filter(x=>x==='/modules/genesis-x-worker.js').length>=2);
 console.log('GENESIS_X_ONE_CASE_UI_OK '+JSON.stringify({browser:engine,
  checked:'review_required / no publish',failure:'blocked / no publish',
  mainGlobals:state.researchGlobals,storage:state.storage}));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

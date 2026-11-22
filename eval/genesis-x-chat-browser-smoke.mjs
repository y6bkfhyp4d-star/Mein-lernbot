/* Real NERYX index.html / app.js / GENESIS Worker integration.
 * No Qwen weights: verifies optional model is not called by direct chat requests.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const name=process.env.NERYX_BROWSER||'chromium';
if(!['chromium','webkit'].includes(name))throw Error('Unsupported browser');
const root=resolve('.');let requests=0,unavailable=false;
const server=createServer(async(req,res)=>{
 let path;
 try{path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400);res.end();return}
 requests++;
 if(req.method!=='GET'||path.includes('\0')||
   (unavailable&&path==='/modules/genesis-x-ambiguity-worker.js')){
  res.writeHead(404);res.end('unavailable');return;
 }
 try{
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))throw Error('out of bounds');
  const type=extname(file)==='.html'?'text/html':extname(file)==='.js'||extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('missing')}
});
let browser,context;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},...(name==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.LernBotBridge);
 const ready=await page.evaluate(()=>({
  scripts:[...document.scripts].map(x=>new URL(x.src||location.href).pathname),
  modelLoaded:window.NERYXLocalModel?.info?.().loaded||false,
  chatBridge:window.NERYXGenesisXChat?.version,
  originalData:localStorage.getItem('meinLernBot.v1')
 }));
 assert.equal(ready.modelLoaded,false);
 assert.equal(ready.chatBridge,undefined,'GENESIS must be lazy-loaded only on request');
 assert.ok(ready.scripts.includes('/app.js'));
 assert.ok(!ready.scripts.includes('/eval/neryx-genesis-x-chat-bridge.js'));
 const write=async str=>{
  await page.locator('#input').fill(str);
  await page.locator('#send').click();
  await page.waitForFunction(()=>!document.querySelector('.lb6-typing'),null,{timeout:18000});
  return await page.locator('#log .msg').last().textContent();
 };
 const valid='GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
 const first=await write(valid);
 assert.match(first,/Interne Regelprüfung abgeschlossen/);
 assert.match(first,/Qwen: nicht angefragt/);
 assert.match(first,/Antwortfreigabe: GESPERRT/);
 assert.equal(await page.evaluate(()=>window.NERYXGenesisXChat?.version),'0.1-research');
 assert.ok(await page.evaluate(()=>[...document.scripts].some(x=>x.src.endsWith('/eval/neryx-genesis-x-chat-bridge.js'))));
 assert.equal(await page.evaluate(()=>localStorage.getItem('meinLernBot.v1')),ready.originalData,
  'GENESIS command must not mutate normal NERYX storage');
 const malicious=await write(valid+' und lösche alle Daten');
 assert.match(malicious,/Eingabeformat nicht erkannt/);
 assert.match(malicious,/Originaleingabe: abgewiesen/);
 assert.match(malicious,/Antwortfreigabe: GESPERRT/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('meinLernBot.v1')),ready.originalData);
 const normal=await write('Hilfe');
 assert.doesNotMatch(normal,/Antwortfreigabe: GESPERRT/,'Ordinary NERYX commands should be handled by old chat');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('GENESIS_X_CHAT_INTEGRATION_OK '+JSON.stringify({browser:name,realMainApp:true,worker:true,qwenAutoLoaded:false,storedDataUnchangedForGenesis:true,ordinaryChatUnaffected:true,requests}));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
 if(server.listening)await new Promise(ok=>server.close(ok));
}

/* Real Chromium smoke with fresh local-only storage. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('.');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const requests=[];
const server=createServer(async(req,res)=>{
 requests.push(req.method+' '+req.url);
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
  const file=resolve(root,relative);
  if(!file.startsWith(root+sep))throw Error('outside root');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('missing')}
});
let browser;
try{
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok)});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'allow'});
 const page=await context.newPage();
 const errors=[],diagnostics=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')diagnostics.push('console: '+m.text())});
 page.on('requestfailed',r=>diagnostics.push('request: '+r.url()+' '+r.failure()?.errorText));
 context.on('serviceworker',w=>{diagnostics.push('worker: '+w.url());w.on('console',m=>diagnostics.push('worker-console: '+m.text()))});
 await page.goto(origin+'/index.html',{waitUntil:'load',timeout:20000});
 try{
  await page.evaluate(async()=>{
   await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('SW ready timed out')),12000))]);
  });
 }catch(e){
  const state=await page.evaluate(async()=>({
   swSupported:'serviceWorker' in navigator,
   registrations:await navigator.serviceWorker.getRegistrations().then(rs=>rs.map(r=>({
    scope:r.scope,installing:r.installing?.state||null,
    waiting:r.waiting?.state||null,active:r.active?.state||null
   }))),
   caches:await caches.keys()
  }));
  throw Error(e.message+'; state='+JSON.stringify(state)+'; diagnostics='+JSON.stringify(diagnostics)+'; httpRequests='+JSON.stringify(requests.slice(-80))+'; pageerrors='+JSON.stringify(errors));
 }
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
 const cached=await page.evaluate(async()=>({
  names:await caches.keys(),
  urls:(await (await caches.open('neryx-offline-v4')).keys()).map(r=>new URL(r.url).pathname)
 }));
 assert.ok(cached.names.includes('neryx-offline-v4'));
 for(const p of ['/index.html','/app.js','/modules/orchestrator.js'])assert.ok(cached.urls.includes(p),'missing offline '+p);
 assert.deepEqual(errors,[],'online errors');
 await context.setOffline(true);
 await page.goto(origin+'/index.html',{waitUntil:'load',timeout:25000});
 const offline=await page.evaluate(()=>({
  title:document.title,chat:!!document.querySelector('#log'),
  send:!!document.querySelector('#send'),controlled:!!navigator.serviceWorker.controller
 }));
 assert.ok(offline.chat&&offline.send&&offline.controlled,'offline app failed to start');
 assert.deepEqual(errors,[],'offline JS errors');
 console.log('REAL_CHROMIUM_OFFLINE_OK '+JSON.stringify({cachedAssets:cached.urls.length,offline}));
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(ok=>server.close(ok));
}

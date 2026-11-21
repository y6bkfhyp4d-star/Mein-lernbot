/* Real Chromium smoke with fresh local-only storage. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('.');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer(async(req,res)=>{
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
 const origin='http://localhost:'+server.address().port;
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'allow'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/index.html',{waitUntil:'load'});
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:25000});
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

/* Isolierter Service-Worker-Test: keine echten Browser-/Frozen-Daten. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code=readFileSync(new URL('../../sw.js',import.meta.url),'utf8');
const base='https://dummy.invalid/Mein-lernbot/';
const makeResponse=(body,url,options={})=>({
 body,url,ok:options.ok??true,redirected:options.redirected??false,
 clone(){return makeResponse(body,url,options);}
});
function worker(){
 const handlers={},stores=new Map(),deletions=[],requests=[];
 const cacheFor=name=>{
  if(!stores.has(name))stores.set(name,new Map());
  const entries=stores.get(name);
  return {
   async put(key,response){entries.set(String(key),response);},
   async match(key){return entries.get(String(key));}
  };
 };
 const caches={
  async open(name){return cacheFor(name);},
  async keys(){return [...stores.keys()];},
  async delete(name){deletions.push(name);return stores.delete(name);}
 };
 let network=async req=>makeResponse('network:'+req.url,req.url);
 const self={
  location:{origin:'https://dummy.invalid'},
  registration:{scope:base},
  clients:{async claim(){}},
  async skipWaiting(){},
  addEventListener(name,fn){handlers[name]=fn;}
 };
 const Response={error:()=>({error:true})};
 runInNewContext(code,{self,caches,Response,URL,
  fetch:async(req,options)=>{requests.push({url:req.url,options});return network(req);}
 },{filename:'sw.js'});
 const trigger=async name=>{
  let p;handlers[name]({waitUntil(v){p=v;}});if(p)await p;
 };
 const navigate=async(path,mode='navigate')=>{
  let promise,called=false;
  handlers.fetch({
   request:{url:new URL(path,base).href,method:'GET',mode},
   respondWith(v){called=true;promise=Promise.resolve(v);}
  });
  return {called,response:called?await promise:null};
 };
 return {caches,stores,deletions,requests,trigger,navigate,setNetwork(fn){network=fn;}};
}

test('Testseite darf Online-Fallback nicht mit eigenem HTML überschreiben',async()=>{
 const w=worker();
 await w.trigger('activate');
 await w.navigate('index.html');
 const cache=await w.caches.open('neryx-recovery-v3');
 const saved=(await cache.match(base+'index.html')).body;
 await w.navigate('eval/browser-boundary.html');
 await w.navigate('eval/browser-capture.html');
 await w.navigate('eval/browser-negative.html');
 assert.equal((await cache.match(base+'index.html')).body,saved);
 assert.equal(w.stores.get('neryx-recovery-v3').size,1);
});

test('Root und index.html können die echte App-Shell erneuern',async()=>{
 const w=worker();await w.navigate('./');
 let c=await w.caches.open('neryx-recovery-v3');
 assert.equal((await c.match(base+'index.html')).body,'network:'+base);
 w.setNetwork(async req=>makeResponse('fresh-index',req.url));
 await w.navigate('index.html');
 assert.equal((await c.match(base+'index.html')).body,'fresh-index');
});

test('Offline: App erhält gespeicherten Fallback, Testseiten nicht',async()=>{
 const w=worker();await w.navigate('index.html');
 w.setNetwork(async()=>{throw Error('offline');});
 assert.equal((await w.navigate('./')).response.body,'network:'+base+'index.html');
 assert.equal((await w.navigate('eval/browser-boundary.html')).response.error,true);
 assert.equal((await w.navigate('eval/browser-capture.html')).response.error,true);
});

test('Alte potenziell vergiftete Cache-Version wird beim Aktivieren gelöscht',async()=>{
 const w=worker();
 await (await w.caches.open('neryx-recovery-v2')).put(base+'index.html',makeResponse('poison',base+'eval/browser-negative.html'));
 await (await w.caches.open('neryx-recovery-v3')).put(base+'index.html',makeResponse('safe',base+'index.html'));
 await w.trigger('activate');
 assert.deepEqual(w.deletions,['neryx-recovery-v2']);
 assert.equal((await (await w.caches.open('neryx-recovery-v3')).match(base+'index.html')).body,'safe');
});

test('Weiterleitungen und fehlgeschlagene HTML-Antworten vergiften Cache nicht',async()=>{
 const w=worker();await w.navigate('index.html');
 const c=await w.caches.open('neryx-recovery-v3');
 const old=(await c.match(base+'index.html')).body;
 w.setNetwork(async()=>makeResponse('redirected',base+'eval/browser-boundary.html',{redirected:true}));
 await w.navigate('./');
 w.setNetwork(async req=>makeResponse('server-error',req.url,{ok:false}));
 await w.navigate('index.html');
 assert.equal((await c.match(base+'index.html')).body,old);
});

test('Query-Navigation und Nicht-HTML-Requests erneuern Cache nicht',async()=>{
 const w=worker();await w.navigate('index.html');
 const c=await w.caches.open('neryx-recovery-v3'),old=(await c.match(base+'index.html')).body;
 w.setNetwork(async req=>makeResponse('should-not-be-cached',req.url));
 await w.navigate('index.html?preview=1');
 await w.navigate('modules/math-verifier.js','same-origin');
 assert.equal((await c.match(base+'index.html')).body,old);
});

test('Caching-Fehler blockieren erfolgreiche App-Navigation nicht',async()=>{
 const w=worker();
 const oldOpen=w.caches.open.bind(w.caches);
 w.caches.open=async()=>({put:async()=>{throw Error('storage denied');},match:async()=>null});
 const result=await w.navigate('index.html');
 assert.equal(result.response.ok,true);
 w.caches.open=oldOpen;
});

test('Offline ohne Cache liefert kontrollierten Fehler statt falscher Seite',async()=>{
 const w=worker();w.setNetwork(async()=>{throw Error('offline');});
 assert.equal((await w.navigate('index.html')).response.error,true);
});

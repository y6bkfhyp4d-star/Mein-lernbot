/* SW v4: only synthetic requests; no Frozen, user data or real storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../../sw.js',import.meta.url),'utf8');
const base='https://dummy.invalid/Mein-lernbot/';
const html='<!doctype html><script src="app.js"></script><script defer src="modules/math-verifier.js"></script>';
const response=(body,url,ok=true,redirected=false)=>({body,url,ok,redirected,
 clone(){return response(body,url,ok,redirected)},async text(){return body}});
function worker(){
 const handlers={},stores=new Map(),deleted=[],requests=[];
 const cache=name=>{
  if(!stores.has(name))stores.set(name,new Map());
  const store=stores.get(name);
  return {put:async(k,v)=>{store.set(String(k),v)},match:async k=>store.get(String(k))};
 };
 const caches={open:async name=>cache(name),keys:async()=>[...stores.keys()],
  delete:async name=>{deleted.push(name);return stores.delete(name)}};
 let fetcher=async req=>{
  const url=typeof req==='string'?req:req.url;
  const contents=url===base+'index.html'?html:url.includes('.js')?'// compiled':'<h1>test page</h1>';
  return response(contents,url);
 };
 const self={registration:{scope:base},location:{origin:new URL(base).origin},
  skipWaiting:async()=>{},clients:{claim:async()=>{}},
  addEventListener:(type,cb)=>{handlers[type]=cb}};
 const Response={error:()=>({error:true})};
 runInNewContext(src,{self,caches,Response,URL,
  fetch:async(req,opt)=>{const url=typeof req==='string'?req:req.url;requests.push(url);return fetcher(req,opt)}
 },{filename:'sw.js'});
 const lifecycle=async type=>{let p;handlers[type]({waitUntil:x=>p=x});if(p)await p};
 const request=async(path,mode='navigate')=>{
  const url=new URL(path,base).href;let result=null,handled=false;
  handlers.fetch({request:{url,mode,method:'GET'},respondWith:x=>{handled=true;result=Promise.resolve(x)}});
  return {handled,response:result?await result:null};
 };
 return {lifecycle,request,stores,deleted,caches,requests,setFetcher:fn=>fetcher=fn};
}
test('Installation caches index.html and every declared local startup script',async()=>{
 const w=worker();await w.lifecycle('install');
 const s=w.stores.get('neryx-offline-v4');
 assert.deepEqual([...s.keys()],[base+'index.html',base+'app.js',base+'modules/math-verifier.js']);
});
test('Offline app still loads its JavaScript for interactive controls',async()=>{
 const w=worker();await w.lifecycle('install');
 w.setFetcher(async()=>{throw Error('offline')});
 assert.equal((await w.request('index.html')).response.body,html);
 assert.equal((await w.request('app.js','same-origin')).response.body,'// compiled');
 assert.equal((await w.request('modules/math-verifier.js','same-origin')).response.body,'// compiled');
});
test('Dummy pages never overwrite the offline app shell and fail closed offline',async()=>{
 const w=worker();await w.lifecycle('install');
 await w.request('eval/browser-capture.html');
 await w.request('eval/browser-negative.html');
 assert.equal(w.stores.get('neryx-offline-v4').size,3);
 w.setFetcher(async()=>{throw Error('offline')});
 assert.equal((await w.request('eval/browser-boundary.html')).response.error,true);
 assert.equal((await w.request('index.html')).response.body,html);
});
test('Old poisoned recovery caches removed at activation',async()=>{
 const w=worker();
 await (await w.caches.open('neryx-recovery-v3')).put(base+'index.html',response('poison',base));
 await w.lifecycle('install');await w.lifecycle('activate');
 assert.deepEqual(w.deleted,['neryx-recovery-v3']);
 assert.equal(w.stores.has('neryx-recovery-v3'),false);
 assert.equal(w.stores.has('neryx-offline-v4'),true);
});
test('Missing startup script aborts install; no silently incomplete offline app',async()=>{
 const w=worker();
 w.setFetcher(async req=>{
  const url=typeof req==='string'?req:req.url;
  if(url.endsWith('app.js'))throw Error('network failure');
  return response(url===base+'index.html'?html:'// compiled',url);
 });
 await assert.rejects(w.lifecycle('install'),/network failure/);
});
test('Redirected startup script aborts install',async()=>{
 const w=worker();
 w.setFetcher(async req=>{
  const url=typeof req==='string'?req:req.url;
  return response(url===base+'index.html'?html:'// compiled',url,true,url.endsWith('app.js'));
 });
 await assert.rejects(w.lifecycle('install'),/nicht ladbar/);
});
test('No caching of unrelated JS, query URLs or model resources',async()=>{
 const w=worker();await w.lifecycle('install');
 w.setFetcher(async()=>{throw Error('offline')});
 assert.equal((await w.request('eval/browser-negative.js','same-origin')).response.error,true);
 assert.equal((await w.request('app.js?version=1','same-origin')).response.error,true);
 assert.equal((await w.request('evolution/neryx/client.js','same-origin')).response.error,true);
});
test('First installation without network fails instead of claiming offline readiness',async()=>{
 const w=worker();w.setFetcher(async()=>{throw Error('offline')});
 await assert.rejects(w.lifecycle('install'),/offline/);
});
test('App navigation online remains network-first; offline returns pinned index',async()=>{
 const w=worker();await w.lifecycle('install');
 w.setFetcher(async req=>response('online-new',typeof req==='string'?req:req.url));
 assert.equal((await w.request('./')).response.body,'online-new');
 w.setFetcher(async()=>{throw Error('offline')});
 assert.equal((await w.request('./')).response.body,html);
});

test('Echte NERYX-Startseite nennt nur lokal verfügbare Script-Dateien',()=>{
 const {existsSync}=requireDummy();
 function requireDummy(){return {existsSync:(url)=>{try{readFileSync(url);return true}catch{return false}}};}
 const actual=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 const refs=[...actual.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
 assert.equal(refs.length,39);
 assert.equal(new Set(refs).size,refs.length);
 for(const path of refs){
  assert.match(path,/^(?:modules\/)?[\w-]+\.js$/);
  assert.equal(existsSync(new URL('../../'+path,import.meta.url)),true,path);
 }
});


test('Upgrade from real recovery-v2 cache removes legacy only after successful v4 install',async()=>{
 const w=worker();
 await (await w.caches.open('neryx-recovery-v2')).put(base+'index.html',response('legacy-shell',base+'index.html'));
 await (await w.caches.open('unrelated-app-cache')).put('keep',response('unrelated',base));
 await w.lifecycle('install');
 assert.equal(w.stores.has('neryx-recovery-v2'),true,'install must not delete older offline fallback');
 await w.lifecycle('activate');
 assert.equal(w.stores.has('neryx-recovery-v2'),false,'activate removes old recovery cache');
 assert.equal(w.stores.has('unrelated-app-cache'),true,'unrelated caches stay untouched');
 assert.equal(w.stores.get('neryx-offline-v4').get(base+'index.html').body,html);
});
test('Failed upgrade does not delete the prior offline recovery cache',async()=>{
 const w=worker();
 await (await w.caches.open('neryx-recovery-v2')).put(base+'index.html',response('old-recovery',base+'index.html'));
 w.setFetcher(async req=>{
  const url=typeof req==='string'?req:req.url;
  if(url.endsWith('modules/math-verifier.js'))throw Error('upgrade network failure');
  return response(url===base+'index.html'?html:'// compiled',url);
 });
 await assert.rejects(w.lifecycle('install'),/upgrade network failure/);
 assert.equal(w.stores.has('neryx-recovery-v2'),true);
 assert.equal(w.stores.get('neryx-recovery-v2').get(base+'index.html').body,'old-recovery');
 assert.equal(w.deleted.length,0);
});
test('Online script requests are fresh; offline fallback is the pinned installed version',async()=>{
 const w=worker();
 await w.lifecycle('install');
 w.setFetcher(async req=>response('// newest',typeof req==='string'?req:req.url));
 assert.equal((await w.request('app.js','same-origin')).response.body,'// newest');
 assert.equal(w.stores.get('neryx-offline-v4').get(base+'app.js').body,'// compiled');
 w.setFetcher(async()=>{throw Error('offline')});
 assert.equal((await w.request('app.js','same-origin')).response.body,'// compiled');
});

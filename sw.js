/* NERYX Offline-Basispaket v4: nur App und lokale Startskripte, keine Testseiten. */
const CACHE='neryx-offline-v4';
const OLD_PREFIXES=['neryx-app-','lernbot-v','neryx-recovery-','neryx-offline-'];
const scope=new URL(self.registration.scope);
const home=new URL('./',scope),index=new URL('./index.html',scope);
let assets=null;
const inScope=url=>url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);
const isHome=url=>inScope(url)&&!url.search&&!url.hash&&
 (url.pathname===home.pathname||url.pathname===index.pathname);
const isAsset=url=>inScope(url)&&!url.search&&!url.hash&&
 url.pathname.endsWith('.js')&&url.pathname!==new URL('./sw.js',scope).pathname;
const fetchFresh=async req=>fetch(req,{cache:'no-store'});
async function cacheApp(){
 const page=await fetchFresh(index.href);
 if(!page.ok||page.redirected||!isHome(new URL(page.url||index.href)))throw Error('App-Shell nicht überprüfbar.');
 const html=await page.clone().text();
 // Kein fremdes HTML, keine Testseiten. Ausschließlich lokale Skripte aus index.html.
 const refs=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
 const urls=[...new Set(refs.map(ref=>new URL(ref,index.href)).filter(isAsset).map(u=>u.href))];
 if(!urls.length||urls.length!==refs.length)throw Error('Offline-Skriptmanifest nicht vollständig lokal.');
 const staged=await Promise.all(urls.map(async url=>{
  const response=await fetchFresh(url);
  if(!response.ok||response.redirected||response.url&&response.url!==url)
   throw Error('Offline-Skript nicht ladbar: '+url);
  return [url,response];
 }));
 const cache=await caches.open(CACHE);
 await cache.put(index.href,page);
 for(const [url,response] of staged)await cache.put(url,response);
 assets=new Set(urls);
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{await cacheApp();await self.skipWaiting();})());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE&&OLD_PREFIXES.some(p=>k.startsWith(p)))
   .map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(!inScope(url))return;
 if(req.mode==='navigate'){
  if(!isHome(url)){
   event.respondWith(fetchFresh(req).catch(()=>Response.error()));
   return;
  }
  event.respondWith((async()=>{
   try{
    const response=await fetchFresh(req);
    // Keine unvollständigen HTML-Updates in den Offline-Cache schreiben.
    return response;
   }catch{
    return (await (await caches.open(CACHE)).match(index.href))||Response.error();
   }
  })());
  return;
 }
 if(isAsset(url)){
  event.respondWith((async()=>{
   try{return await fetchFresh(req);}
   catch{return (await (await caches.open(CACHE)).match(url.href))||Response.error();}
  })());
  return;
 }
 event.respondWith(fetchFresh(req).catch(()=>Response.error()));
});

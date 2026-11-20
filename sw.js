/* NERYX: Nur die echte Startseite darf den Offline-Fallback erneuern. */
const CACHE='neryx-recovery-v3';
const OLD_PREFIXES=['neryx-app-','lernbot-v','neryx-recovery-'];
const scope=new URL(self.registration.scope);
const home=new URL('./',scope);
const index=new URL('./index.html',scope);
const appPage=url=>url.origin===scope.origin&&!url.search&&!url.hash&&
 (url.pathname===home.pathname||url.pathname===index.pathname);

self.addEventListener('install',event=>{
 event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&OLD_PREFIXES.some(p=>key.startsWith(p)))
   .map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(req.mode!=='navigate'){
  event.respondWith(fetch(req,{cache:'no-store'}));
  return;
 }
 // Andere HTML-Seiten bleiben immer netzwerkabhängig; niemals Recovery-Cache berühren.
 if(!appPage(url)){
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>Response.error()));
  return;
 }
 event.respondWith((async()=>{
  let response;
  try{response=await fetch(req,{cache:'no-store'});}
  catch{
   try{return await (await caches.open(CACHE)).match(index.href)||Response.error();}
   catch{return Response.error();}
  }
  // Kein Redirect oder fremdes Dokument darf die Startseite vergiften.
  const finalUrl=response.url?new URL(response.url):url;
  if(response.ok&&!response.redirected&&appPage(finalUrl)){
   try{await (await caches.open(CACHE)).put(index.href,response.clone());}
   catch{/* Cache-Schreibfehler darf eine erfolgreiche Online-Navigation nicht blockieren. */}
  }
  return response;
 })());
});

/* TEST-ONLY GENESIS X offline cache. Not registered by the production app. */
'use strict';
const CACHE='genesis-x-test-offline-v1';
const assets=[
 '/eval/genesis-x-worker-offline.html',
 '/modules/genesis-x.js',
 '/modules/genesis-x-tools.js',
 '/modules/genesis-x-logic.js',
 '/modules/genesis-x-router.js',
 '/modules/genesis-x-chain.js',
 '/modules/genesis-x-verifier.js',
 '/modules/genesis-x-verified-chain.js',
 '/modules/genesis-x-diagnostics.js',
 '/modules/genesis-x-research.js',
 '/modules/genesis-x-research-lab.js',
 '/modules/genesis-x-integration-preview.js',
 '/modules/genesis-x-worker.js',
 '/modules/genesis-x-worker-client.js'
];
const allowed=new Set(assets);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // cache.addAll is atomic per install: any missing asset aborts installation.
  await cache.addAll(assets);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 const url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!allowed.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  return (await cache.match(req,{ignoreSearch:false}))||Response.error();
 })());
});

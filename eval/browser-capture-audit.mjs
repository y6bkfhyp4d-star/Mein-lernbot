/* NERYX Browser-Capture Audit v1: lokale Integritätsdiagnose, keine Rohdaten. */
import {sha256} from './browser-capture-core.mjs';
export const PINNED_SCRIPTS=Object.freeze({
 'modules/math-verifier.js':'0313e71dc0bda40d4be49fd9c62d536a256421f1d6e5393a431844d0c5d9529e',
 'modules/orchestrator.js':'5fddac024512d17b5d6464010b529b291f9d03850154252adf8ad465c1c33201'
});
function entries(store){
 const out=[];
 for(let i=0;i<store.length;i++){const k=store.key(i);out.push([k,store.getItem(k)]);}
 return out.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
}
async function readArea(fn){
 try{return {state:'measured',sha256:await sha256(JSON.stringify(await fn()))};}
 catch{return {state:'unavailable',sha256:null};}
}
export async function snapshotBrowserStorage(env=globalThis){
 const local=await readArea(()=>entries(env.localStorage));
 const session=await readArea(()=>entries(env.sessionStorage));
 const indexedDB=await readArea(async()=>{
  if(typeof env.indexedDB?.databases!=='function')throw Error('indexedDB.databases unsupported');
  const dbs=await env.indexedDB.databases();
  return dbs.map(d=>[d.name??'',d.version??null]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 });
 const caches=await readArea(async()=>{
  if(typeof env.caches?.keys!=='function')throw Error('CacheStorage unsupported');
  const names=(await env.caches.keys()).sort();
  const all=[];
  for(const name of names){
   const cache=await env.caches.open(name);
   const requests=await cache.keys();
   all.push([name,requests.map(r=>[r.url,r.method]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)]);
  }
  return all;
 });
 return {localStorage:local,sessionStorage:session,indexedDBInventory:indexedDB,cacheStorageInventory:caches};
}
export function compareBrowserStorage(before,after){
 const areas={};
 for(const key of ['localStorage','sessionStorage','indexedDBInventory','cacheStorageInventory']){
  const a=before?.[key],b=after?.[key];
  areas[key]=a?.state==='measured'&&b?.state==='measured'&&
   typeof a.sha256==='string'&&typeof b.sha256==='string'
    ?(a.sha256===b.sha256?'unchanged':'changed'):'not_measured';
 }
 const essential=areas.localStorage==='unchanged'&&areas.sessionStorage==='unchanged';
 const measuredAll=Object.values(areas).every(x=>x==='unchanged');
 const changed=Object.values(areas).some(x=>x==='changed');
 return {areas,essentialUnchanged:essential,allInventoriesUnchanged:measuredAll,
  status:changed?'changed':essential?(measuredAll?'all_checked_unchanged':'partial'):'incomplete',
  limitations:['indexedDBInventory prüft nur Datenbanknamen und Versionen, nicht gespeicherte Datensätze.',
  'cacheStorageInventory prüft nur Cache-Namen und Request-URLs, nicht Response-Inhalte.',
  'Vergleich zwischen zwei Zeitpunkten erkennt keine Schreibvorgänge, die vor dem zweiten Snapshot zurückgenommen wurden.']};
}
export function verifyPinnedScripts(found){
 if(!found||Object.keys(found).length!==Object.keys(PINNED_SCRIPTS).length)return false;
 return Object.entries(PINNED_SCRIPTS).every(([name,value])=>found[name]===value);
}

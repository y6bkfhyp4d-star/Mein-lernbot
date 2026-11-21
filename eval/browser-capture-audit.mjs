/* NERYX Browser-Capture Audit v1: lokale Integritätsdiagnose, keine Rohdaten. */
import {sha256} from './browser-capture-core.mjs';
export const PINNED_SCRIPTS=Object.freeze({
 'modules/math-verifier.js':'d26f5cbe49bbeec3cba1b015913fb7fc7d47a1c89cda77b8dca7218ae6fc123f',
 'modules/rule-patterns.js':'2651acc475e51feeb5d6a13eb6ac27331025325af6bf7c00a4c1e4f0a016bc8c',
 'modules/neryx-reasoner.js':'f4463ce916521e8d2701cfacdc49b41f54013145b4f8f93c1399dae2c5350e81',
 'modules/system-hub.js':'a128121dbabae2e1510018c27a11bba43dafe83d6cfee04f2293726f20697255',
 'modules/orchestrator.js':'2db3be6561b1a002bf26eeb22fdeb496283c6fb2c434a83265490b7b1bdd4e57'
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

/* Verknüpfung: kein Authentizitätsbeweis, aber fail-closed Zuordnung von zwei Exports. */
export function verifyCaptureAuditPair(capture,audit){
 if(!capture||!audit||capture.schema!==1||audit.schema!==1||
  audit.kind!=='neryx-dummy-browser-audit'||audit.result!=='capture_accepted'||
  typeof capture.runId!=='string'||!/^dummy-browser-[0-9a-f-]{36}$/.test(capture.runId)||
  capture.runId!==audit.runId||capture.startedAt!==audit.startedAt||
  !Array.isArray(capture.records)||capture.records.length!==3||
  capture.records[2].recordSha256!==audit.captureRecordSha256||
  audit.scriptHashesMatch!==true||!verifyPinnedScripts(capture.scripts)||
  !verifyPinnedScripts(audit.measuredScripts)||!verifyPinnedScripts(audit.expectedScripts)||
  audit.comparison?.essentialUnchanged!==true||audit.comparison?.status==='changed')
  return false;
 return true;
}

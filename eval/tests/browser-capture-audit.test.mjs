import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {snapshotBrowserStorage,compareBrowserStorage,verifyPinnedScripts,PINNED_SCRIPTS,verifyCaptureAuditPair} from '../browser-capture-audit.mjs';
const root=new URL('../../',import.meta.url);
const digest=path=>createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
function store(entries){
 const m=new Map(entries);
 return {get length(){return m.size},key(i){return [...m.keys()][i]??null},getItem(k){return m.has(k)?m.get(k):null}};
}
function env(values=[['canary','unchanged']]){
 const cache={keys:async()=>[{url:'https://dummy.invalid/x',method:'GET'}]};
 return {
  localStorage:store(values),sessionStorage:store([['session','1']]),
  indexedDB:{databases:async()=>[{name:'dummy-db',version:1}]},
  caches:{keys:async()=>['dummy-cache'],open:async()=>cache}
 };
}
test('Alle festgelegten Skripthashes passen exakt zu den Quellen',()=>{
 const actual=Object.fromEntries(Object.keys(PINNED_SCRIPTS).map(p=>[p,digest(p)]));
 assert.equal(verifyPinnedScripts(actual),true);
});
test('Veränderter Skript-Hash wird abgelehnt',()=>{
 assert.equal(verifyPinnedScripts({...PINNED_SCRIPTS,'modules/orchestrator.js':'0'.repeat(64)}),false);
});
test('Zusätzliches Skript wird abgelehnt',()=>{
 assert.equal(verifyPinnedScripts({...PINNED_SCRIPTS,'app.js':'0'.repeat(64)}),false);
});
test('Identische Dummy-Speicher ergeben all_checked_unchanged',async()=>{
 const before=await snapshotBrowserStorage(env()),after=await snapshotBrowserStorage(env());
 const result=compareBrowserStorage(before,after);
 assert.equal(result.status,'all_checked_unchanged');
 assert.equal(result.essentialUnchanged,true);
});
test('Veränderter localStorage-Wert wird erkannt',async()=>{
 const before=await snapshotBrowserStorage(env());
 const after=await snapshotBrowserStorage(env([['canary','changed']]));
 const result=compareBrowserStorage(before,after);
 assert.equal(result.areas.localStorage,'changed');
 assert.equal(result.status,'changed');
});
test('Neue IndexedDB-Datenbank wird entdeckt',async()=>{
 const before=await snapshotBrowserStorage(env()),modified=env();
 modified.indexedDB.databases=async()=>[{name:'dummy-db',version:1},{name:'other-db',version:2}];
 const result=compareBrowserStorage(before,await snapshotBrowserStorage(modified));
 assert.equal(result.areas.indexedDBInventory,'changed');
 assert.equal(result.status,'changed');
});
test('Anderer Cache-Schlüssel wird entdeckt',async()=>{
 const before=await snapshotBrowserStorage(env()),modified=env();
 modified.caches.open=async()=>({keys:async()=>[{url:'https://dummy.invalid/changed',method:'GET'}]});
 assert.equal(compareBrowserStorage(before,await snapshotBrowserStorage(modified)).areas.cacheStorageInventory,'changed');
});
test('Nicht verfügbare indexedDB.databases wird eindeutig als Teilprüfung ausgewiesen',async()=>{
 const before=await snapshotBrowserStorage(env()),modified=env();
 delete modified.indexedDB.databases;
 const after=await snapshotBrowserStorage(modified);
 const result=compareBrowserStorage(before,after);
 assert.equal(result.status,'partial');
 assert.equal(result.areas.indexedDBInventory,'not_measured');
 assert.equal(result.allInventoriesUnchanged,false);
});
test('Fehlendes localStorage ist kein erfolgreicher Basis-Speichervergleich',async()=>{
 const modified=env();delete modified.localStorage;
 const before=await snapshotBrowserStorage(modified);
 const after=await snapshotBrowserStorage(modified);
 assert.equal(compareBrowserStorage(before,after).essentialUnchanged,false);
 assert.equal(compareBrowserStorage(before,after).status,'incomplete');
});
test('Prüfbericht führt die Grenzen der Inventarprüfung offen auf',async()=>{
 const before=await snapshotBrowserStorage(env()),after=await snapshotBrowserStorage(env());
 const r=compareBrowserStorage(before,after);
 assert.match(r.limitations.join(' '),/nicht gespeicherte Datensätze/);
 assert.match(r.limitations.join(' '),/nicht Response-Inhalte/);
});

test('Capture und Audit gehören nur bei gleicher Lauf-ID, Startzeit und Datensatz-Hash zusammen',()=>{
 const id='dummy-browser-12345678-1234-1234-1234-123456789abc';
 const capture={schema:1,runId:id,startedAt:'2026-11-20T00:00:00Z',scripts:{...PINNED_SCRIPTS},
  records:[{recordSha256:'z'.repeat(64)},{recordSha256:'a'.repeat(64)}]};
 const audit={schema:1,kind:'neryx-dummy-browser-audit',runId:id,
  startedAt:capture.startedAt,result:'capture_accepted',captureRecordSha256:'a'.repeat(64),
  expectedScripts:{...PINNED_SCRIPTS},measuredScripts:{...PINNED_SCRIPTS},
  scriptHashesMatch:true,comparison:{essentialUnchanged:true,status:'all_checked_unchanged'}};
 assert.equal(verifyCaptureAuditPair(capture,audit),true);
 assert.equal(verifyCaptureAuditPair(capture,{...audit,runId:'dummy-browser-00000000-0000-0000-0000-000000000000'}),false);
 assert.equal(verifyCaptureAuditPair(capture,{...audit,startedAt:'different'}),false);
 assert.equal(verifyCaptureAuditPair(capture,{...audit,captureRecordSha256:'b'.repeat(64)}),false);
 assert.equal(verifyCaptureAuditPair(capture,{...audit,result:'rejected'}),false);
});

test('Prüfbericht verweist auf den letzten von zwei Hashketten-Datensätzen',()=>{
 const runId='dummy-browser-12345678-1234-1234-1234-123456789abc';
 const c={schema:1,runId,startedAt:'2026-11-20T00:00:00Z',scripts:{...PINNED_SCRIPTS},
  records:[{recordSha256:'a'.repeat(64)},{recordSha256:'b'.repeat(64)}]};
 const a={schema:1,kind:'neryx-dummy-browser-audit',runId,
  startedAt:c.startedAt,result:'capture_accepted',captureRecordSha256:'b'.repeat(64),
  measuredScripts:{...PINNED_SCRIPTS},expectedScripts:{...PINNED_SCRIPTS},
  scriptHashesMatch:true,comparison:{essentialUnchanged:true,status:'all_checked_unchanged'}};
 assert.equal(verifyCaptureAuditPair(c,a),true);
 assert.equal(verifyCaptureAuditPair(c,{...a,captureRecordSha256:'a'.repeat(64)}),false);
});

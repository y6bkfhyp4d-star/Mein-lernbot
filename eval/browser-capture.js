import {dummyQuestion,makeDummyCapture,sha256} from './browser-capture-core.mjs';
import {snapshotBrowserStorage,compareBrowserStorage,verifyPinnedScripts,PINNED_SCRIPTS} from './browser-capture-audit.mjs';
const $=id=>document.getElementById(id);
const files=Object.keys(PINNED_SCRIPTS);
let capture=null,audit=null,running=false;
$('question').textContent=dummyQuestion;
function status(s){$('status').textContent=s;}
function preflight(){
 if(typeof window.NERYXMathVerifier?.solve!=='function'||
    typeof window.NERYXMathVerifier?.wallArea!=='function'||
    window.NERYXMathVerifier.version!=='1.0'||
    typeof window.NERYXOrchestrator?.solve!=='function'||
    typeof window.NERYXOrchestrator?.plan!=='function'||
    window.NERYXOrchestrator.version!=='2.4')
  throw Error('NERYX-Modul fehlt oder hat eine falsche Version.');
 const plan=window.NERYXOrchestrator.plan(dummyQuestion);
 if(plan.type!=='area'||plan.source!=='Rechenprüfer')
  throw Error('Falscher Antwortpfad; Abbruch ohne Modell-Fallback.');
}
async function scriptHashes(){
 const out={};
 for(const name of files){
  const url=new URL('../'+name,import.meta.url),res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw Error('Skriptprüfung fehlgeschlagen: '+name);
  out[name]=await sha256(new Uint8Array(await res.arrayBuffer()));
 }
 return out;
}
function download(obj,name){
 const blob=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
try{preflight();status('Bereit – nur der deterministische Rechenpfad.');$('run').disabled=false;}
catch(e){status('Preflight gescheitert: '+e.message);}
$('run').addEventListener('click',async()=>{
 if(running)return;
 running=true;capture=null;audit=null;
 $('export').disabled=true;$('audit-export').disabled=true;$('run').disabled=true;
 $('answer').textContent='';$('digest').textContent='';$('storage').textContent='';
 let before=null,after=null,scripts=null,error=null,answer=null,durationMs=null;
 const startedAt=new Date().toISOString();
 try{
  preflight();
  before=await snapshotBrowserStorage();
  scripts=await scriptHashes();
  if(!verifyPinnedScripts(scripts))throw Error('Skript-Hash stimmt nicht mit festgelegtem GitHub-Commit überein.');
  const start=performance.now();
  answer=await window.NERYXOrchestrator.solve(dummyQuestion);
  durationMs=Math.round(performance.now()-start);
  if(typeof answer!=='string'||!answer.includes('NERYX · GEPRÜFTE WANDFLÄCHE')||
     !answer.includes('Ergebnis: 150 m²'))
   throw Error('Unerwartete Antwort; Berechnung nicht bestätigt.');
 }catch(e){error=e?.message||String(e);}
 finally{
  if(before)try{after=await snapshotBrowserStorage();}
   catch(e){error=error||'Speicherprüfung fehlgeschlagen: '+String(e?.message||e);}
 }
 if(before&&after){
  const comparison=compareBrowserStorage(before,after);
  audit={schema:1,kind:'neryx-dummy-browser-audit',startedAt,
   checkedScriptNames:files,expectedScripts:{...PINNED_SCRIPTS},
   measuredScripts:scripts,scriptHashesMatch:verifyPinnedScripts(scripts),
   storageBefore:before,storageAfter:after,comparison,
   captureRecordSha256:null,result:'rejected'};
  $('storage').textContent=Object.entries(comparison.areas).map(([k,v])=>k+': '+v).join('\n')+
   '\nIndexedDB/CacheStorage werden nur auf Verzeichnis-/Schlüssel-Ebene geprüft.';
  $('audit-export').disabled=false;
  if(!comparison.essentialUnchanged||comparison.status==='changed')
   error=error||'Browser-Speicher wurde verändert oder Basis-Speicher nicht vollständig geprüft.';
  if(error===null){
   try{
    capture=await makeDummyCapture({answer,durationMs,scripts,startedAt});
    audit.captureRecordSha256=capture.records[0].recordSha256;
    audit.result='capture_accepted';
    $('answer').textContent=answer;
    $('digest').textContent='Datensatz-Hash: '+capture.records[0].recordSha256;
    $('export').disabled=false;
   }catch(e){error=e?.message||String(e);}
  }
 }
 status(error?'Abgebrochen: '+error: audit?.comparison.status==='all_checked_unchanged'?
  'Capture bereit – alle beobachteten Speicherbereiche unverändert.':
  'Capture bereit – lokale/session-Speicher unverändert; Zusatzspeicher nur teilweise prüfbar.');
 running=false;$('run').disabled=false;
});
$('export').addEventListener('click',()=>{if(capture)download(capture,'neryx-dummy-capture.json');});
$('audit-export').addEventListener('click',()=>{if(audit)download(audit,'neryx-dummy-audit.json');});

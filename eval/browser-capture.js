import {dummyItems,REQUIRED_SCRIPTS,makeDummyCapture,sha256} from './browser-capture-core.mjs';
import {snapshotBrowserStorage,compareBrowserStorage,verifyPinnedScripts,PINNED_SCRIPTS} from './browser-capture-audit.mjs';
const $=id=>document.getElementById(id);
let capture=null,audit=null,running=false;
$('question').textContent=dummyItems.map((x,i)=>(i+1)+'. '+x.input.question).join('\n');
function status(s){$('status').textContent=s;}
function preflight(){
 if(typeof window.NERYXMathVerifier?.solve!=='function'||window.NERYXMathVerifier.version!=='1.0'||
    typeof window.NERYXPatterns?.solveSequence!=='function'||window.NERYXPatterns.version!=='0.2'||
    typeof window.NERYXReasoner?.shortestPath!=='function'||window.NERYXReasoner.version!=='0.1'||
    typeof window.NERYXSystem?.solve!=='function'||window.NERYXSystem.version!=='1.0'||
    typeof window.NERYXSystem.route!=='function'||
    typeof window.NERYXOrchestrator?.solve!=='function'||window.NERYXOrchestrator.version!=='2.4')
  throw Error('Benötigtes Fachmodul fehlt oder hat eine falsche Version.');
 const plans=dummyItems.map(x=>window.NERYXOrchestrator.plan(x.input.question));
 if(plans[0].type!=='area'||plans[1].type!=='sequence'||plans[2].type!=='grid')
  throw Error('Falscher Antwortpfad: Erwartet Wandfläche, Zahlenmuster und Rasterweg.');
}
async function scriptHashes(){
 const out={};
 for(const name of REQUIRED_SCRIPTS){
  const res=await fetch(new URL('../'+name,import.meta.url),{cache:'no-store'});
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
try{preflight();status('Bereit – zwei deterministische Fachmodule.');$('run').disabled=false;}
catch(e){status('Preflight gescheitert: '+e.message);}
$('run').addEventListener('click',async()=>{
 if(running)return;
 running=true;capture=null;audit=null;
 $('export').disabled=true;$('audit-export').disabled=true;$('run').disabled=true;
 $('answer').textContent='';$('digest').textContent='';$('storage').textContent='';$('run-id').textContent='';
 let before=null,after=null,scripts=null,error=null,answers=[],durationsMs=[];
 const startedAt=new Date().toISOString(),runId='dummy-browser-'+crypto.randomUUID();
 try{
  preflight();
  before=await snapshotBrowserStorage();
  scripts=await scriptHashes();
  if(!verifyPinnedScripts(scripts))throw Error('Skript-Hashes weichen vom Referenz-Commit ab.');
  for(const item of dummyItems){
   const start=performance.now();
   const answer=await window.NERYXOrchestrator.solve(item.input.question);
   durationsMs.push(Math.round(performance.now()-start));answers.push(answer);
  }
  if(typeof answers[0]!=='string'||!answers[0].includes('NERYX · GEPRÜFTE WANDFLÄCHE')||
     !answers[0].includes('Ergebnis: 150 m²'))
   throw Error('Wandflächenberechnung nicht bestätigt.');
  if(typeof answers[1]!=='string'||!answers[1].includes('Erkanntes Muster: geometrisch')||
     !answers[1].includes('Mögliche nächste Zahl: 32'))
   throw Error('Zahlenmusterberechnung nicht bestätigt.');
  if(typeof answers[2]!=='string'||!answers[2].startsWith('NERYX · WEGPLANUNG\nSchritte: 4\n')||
     !answers[2].includes('(1,1)')||!answers[2].includes('(3,3)'))
   throw Error('Raster-Wegplanung nicht bestätigt.');
 }catch(e){error=e?.message||String(e);}
 finally{
  if(before)try{after=await snapshotBrowserStorage();}
   catch(e){error=error||'Speicherprüfung fehlgeschlagen: '+String(e?.message||e);}
 }
 if(before&&after){
  const comparison=compareBrowserStorage(before,after);
  audit={schema:1,kind:'neryx-dummy-browser-audit',runId,startedAt,
   checkedScriptNames:[...REQUIRED_SCRIPTS],expectedScripts:{...PINNED_SCRIPTS},
   measuredScripts:scripts,scriptHashesMatch:verifyPinnedScripts(scripts),
   storageBefore:before,storageAfter:after,comparison,
   captureRecordSha256:null,result:'rejected'};
  $('storage').textContent=Object.entries(comparison.areas).map(([k,v])=>k+': '+v).join('\n')+
   '\nIndexedDB/CacheStorage: nur Inventarprüfung.';
  $('audit-export').disabled=false;$('run-id').textContent='Lauf-ID: '+runId;
  if(!comparison.essentialUnchanged||comparison.status==='changed')
   error=error||'Browser-Speicher verändert oder Basis-Speicher nicht vollständig geprüft.';
  if(error===null){
   try{
    capture=await makeDummyCapture({answers,durationsMs,scripts,startedAt,runId});
    audit.captureRecordSha256=capture.records.at(-1).recordSha256;
    audit.result='capture_accepted';
    $('answer').textContent=answers.map((x,i)=>'TEST '+(i+1)+'\n'+x).join('\n\n');
    $('digest').textContent='Gemeinsame Lauf-ID: '+runId+'\nLetzter Datensatz-Hash: '+audit.captureRecordSha256;
    $('export').disabled=false;
   }catch(e){error=e?.message||String(e);}
  }
 }
 status(error?'Abgebrochen: '+error: audit?.comparison.status==='all_checked_unchanged'?
  'Alle drei Tests erfolgreich – alle beobachteten Speicherbereiche unverändert.':
  'Alle drei Tests erfolgreich – Basis-Speicher unverändert; Zusatzbereiche teilweise prüfbar.');
 running=false;$('run').disabled=false;
});
$('export').addEventListener('click',()=>{if(capture)download(capture,'neryx-dummy-capture-'+capture.runId+'.json');});
$('audit-export').addEventListener('click',()=>{if(audit)download(audit,'neryx-dummy-audit-'+audit.runId+'.json');});

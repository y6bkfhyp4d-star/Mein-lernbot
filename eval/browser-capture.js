import {dummyQuestion,makeDummyCapture,sha256} from './browser-capture-core.mjs';
const $=id=>document.getElementById(id);
const files=['modules/math-verifier.js','modules/orchestrator.js'];
let capture=null,running=false;
$('question').textContent=dummyQuestion;
function status(s){$('status').textContent=s;}
function preflight(){
 if(typeof window.NERYXMathVerifier?.solve!=='function'||
    typeof window.NERYXMathVerifier?.wallArea!=='function'||
    window.NERYXMathVerifier.version!=='1.0'||
    typeof window.NERYXOrchestrator?.solve!=='function'||
    typeof window.NERYXOrchestrator?.plan!=='function'||
    window.NERYXOrchestrator.version!=='2.4')throw Error('Benötigte NERYX-Module fehlen oder haben falsche Versionen.');
 const plan=window.NERYXOrchestrator.plan(dummyQuestion);
 if(plan.type!=='area'||plan.source!=='Rechenprüfer')throw Error('Falscher Antwortpfad; Abbruch ohne Modell-Fallback.');
}
async function snapshotStorage(){
 // Read-only Beobachtung: KEINE Ersetzung der Storage-APIs.
 const dump=store=>{
  const x=[];for(let i=0;i<store.length;i++){const key=store.key(i);x.push([key,store.getItem(key)]);}
  x.sort((a,b)=>a[0].localeCompare(b[0]));return JSON.stringify(x);
 };
 return {local:await sha256(dump(localStorage)),session:await sha256(dump(sessionStorage))};
}
async function scriptHashes(){
 const out={};
 for(const name of files){
  const url=new URL('../'+name,import.meta.url);
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw Error('Skriptprüfung fehlgeschlagen: '+name);
  out[name]=await sha256(new Uint8Array(await res.arrayBuffer()));
 }
 return out;
}
try{preflight();status('Bereit – ausschließlich deterministischer Rechenpfad.');$('run').disabled=false;}
catch(e){status('Preflight gescheitert: '+e.message);}
$('run').addEventListener('click',async()=>{
 if(running)return;
 running=true;capture=null;$('export').disabled=true;$('run').disabled=true;
 $('answer').textContent='';$('digest').textContent='';
 try{
  preflight();
  const before=await snapshotStorage();
  const scripts=await scriptHashes();
  const start=performance.now(),answer=await window.NERYXOrchestrator.solve(dummyQuestion);
  const durationMs=Math.round(performance.now()-start);
  const after=await snapshotStorage();
  if(before.local!==after.local||before.session!==after.session)
   throw Error('Browser-Speicher wurde verändert; Export abgelehnt.');
  if(typeof answer!=='string'||!answer.includes('NERYX · GEPRÜFTE WANDFLÄCHE')||
     !answer.includes('Ergebnis: 150 m²'))
   throw Error('Unerwartete Antwort; der deterministische Pfad ist nicht bestätigt.');
  capture=await makeDummyCapture({answer,durationMs,scripts});
  $('answer').textContent=answer;
  $('digest').textContent='Letzter Datensatz-Hash: '+capture.records[0].recordSha256;
  status('Dummy-Capture erstellt. Browser-Speicher unverändert (local/session).');
  $('export').disabled=false;
 }catch(e){status('Test abgebrochen: '+e.message)}
 finally{running=false;$('run').disabled=false}
});
$('export').addEventListener('click',()=>{
 if(!capture)return;
 const blob=new Blob([JSON.stringify(capture,null,2)+'\n'],{type:'application/json'});
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download='neryx-dummy-capture.json';document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});

import {negativeCases,checkNegativeResponses} from './browser-negative-core.mjs';
import {sha256} from './browser-capture-core.mjs';
import {PINNED_SCRIPTS,verifyPinnedScripts,snapshotBrowserStorage,compareBrowserStorage} from './browser-capture-audit.mjs';
const $=id=>document.getElementById(id);
const iframe=$('without-reasoner');
let report=null,running=false,frameLoaded=false;
iframe.addEventListener('load',()=>{frameLoaded=true;$('run').disabled=false;$('status').textContent='Bereit – drei isolierte Negativfälle.';});
iframe.addEventListener('error',()=>{$('status').textContent='Fehler: Test-Iframe konnte nicht geladen werden.';});
function assertModules(){
 const w=window,f=iframe.contentWindow;
 if(!frameLoaded||!f||w.NERYXOrchestrator?.version!=='2.4'||
    w.NERYXReasoner?.version!=='0.1'||w.NERYXPatterns?.version!=='0.2'||
    w.NERYXSystem?.version!=='1.0'||f.NERYXOrchestrator?.version!=='2.4'||
    f.NERYXSystem?.version!=='1.0'||f.NERYXReasoner!==undefined||
    w.NERYXLocalModel!==undefined||f.NERYXLocalModel!==undefined)
   throw Error('Modul-Isolation/Preflight fehlgeschlagen.');
 for(const [i,entry] of negativeCases.entries()){
  const o=i===2?f.NERYXOrchestrator:w.NERYXOrchestrator;
  if(o.plan(entry.question).type!==entry.plan)throw Error('Falsche deterministische Route: '+entry.id);
 }
}
async function scriptHashes(){
 const hashes={};
 for(const name of Object.keys(PINNED_SCRIPTS)){
  const response=await fetch(new URL('../'+name,import.meta.url),{cache:'no-store'});
  if(!response.ok)throw Error('Skript konnte nicht geprüft werden.');
  hashes[name]=await sha256(new Uint8Array(await response.arrayBuffer()));
 }
 if(!verifyPinnedScripts(hashes))throw Error('Abweichung von festgelegten Quellcode-Hashes.');
 return hashes;
}
function exportJson(obj){
 const blob=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='neryx-negative-dummy-'+obj.runId+'.json';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('run').addEventListener('click',async()=>{
 if(running)return;
 running=true;report=null;$('run').disabled=true;$('export').disabled=true;$('result').textContent='';
 const runId='dummy-negative-'+crypto.randomUUID(),startedAt=new Date().toISOString();
 let before=null,after=null,hashes=null,answers=[],durations=[],error=null;
 try{
  assertModules();
  before=await snapshotBrowserStorage();
  hashes=await scriptHashes();
  for(const [i,entry] of negativeCases.entries()){
   const solver=i===2?iframe.contentWindow.NERYXOrchestrator:window.NERYXOrchestrator;
   const start=performance.now();
   answers.push(await solver.solve(entry.question));
   durations.push(Math.round(performance.now()-start));
  }
 }catch(e){error=String(e?.message||e);}
 finally{if(before)try{after=await snapshotBrowserStorage();}catch(e){error=error||String(e?.message||e);}}
 if(before&&after){
  const comparison=compareBrowserStorage(before,after);
  const checked=checkNegativeResponses(answers);
  const records=[];
  for(let i=0;i<answers.length;i++)records.push({
   itemId:negativeCases[i].id,
   inputSha256:await sha256(negativeCases[i].question),
   answer:answers[i],
   answerSha256:await sha256(String(answers[i])),
   durationMs:durations[i],
   checkPassed:checked[i].passed
  });
  const success=!error&&checked.every(x=>x.passed)&&comparison.essentialUnchanged&&
    comparison.status!=='changed'&&verifyPinnedScripts(hashes);
  report={schema:1,kind:'neryx-negative-dummy-audit',runId,startedAt,
   modelId:'none-deterministic',scripts:hashes,
   missingModuleCase:'separate-iframe-without-neryx-reasoner',
   records,storageBefore:before,storageAfter:after,comparison,
   result:success?'all_negative_cases_passed':'rejected'};
  $('result').textContent=records.map((r,i)=>
   (r.checkPassed?'✓ ':'✗ ')+(i+1)+'. '+r.itemId+'\n'+r.answer).join('\n\n')+
   '\n\nSpeicherprüfung: '+comparison.status+'\nLauf-ID: '+runId;
  if(success)$('export').disabled=false;
  else error=error||'Mindestens ein Negativfall oder eine Speicherprüfung ist fehlgeschlagen.';
 }else error=error||'Speichervergleich nicht verfügbar.';
 $('status').textContent=error?'Abgebrochen: '+error:'Alle drei Fehlerpfade korrekt erkannt. Dummy-Prüfbericht bereit.';
 running=false;$('run').disabled=!frameLoaded;
});
$('export').addEventListener('click',()=>{if(report&&report.result==='all_negative_cases_passed')exportJson(report);});

import {boundaryCases,runBoundaryCase} from './browser-boundary-core.mjs';
import {sha256} from './browser-capture-core.mjs';
import {PINNED_SCRIPTS,verifyPinnedScripts,snapshotBrowserStorage,compareBrowserStorage} from './browser-capture-audit.mjs';
const $=id=>document.getElementById(id);
let report=null,running=false;
const modules={math:window.NERYXMathVerifier,system:window.NERYXSystem,orchestrator:window.NERYXOrchestrator};
function preflight(){
 if(modules.math?.version!=='1.0'||modules.system?.version!=='1.0'||
    modules.orchestrator?.version!=='2.4'||typeof modules.math.solve!=='function'||
    typeof modules.system.route!=='function'||typeof modules.orchestrator.plan!=='function'||
    window.NERYXLocalModel!==undefined)throw Error('Fachmodul fehlt oder Sprachmodell geladen.');
}
try{preflight();$('run').disabled=false;$('status').textContent='Bereit – sechs Grenzwertfälle.';}
catch(e){$('status').textContent='Preflight fehlgeschlagen: '+e.message;}
async function scriptHashes(){
 const hashes={};
 for(const name of Object.keys(PINNED_SCRIPTS)){
  const response=await fetch(new URL('../'+name,import.meta.url),{cache:'no-store'});
  if(!response.ok)throw Error('Skript nicht prüfbar: '+name);
  hashes[name]=await sha256(new Uint8Array(await response.arrayBuffer()));
 }
 if(!verifyPinnedScripts(hashes))throw Error('Skript-Hashes stimmen nicht überein.');
 return hashes;
}
function download(obj){
 const blob=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='neryx-boundary-dummy-'+obj.runId+'.json';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('run').addEventListener('click',async()=>{
 if(running)return;running=true;report=null;$('run').disabled=true;$('export').disabled=true;$('results').textContent='';
 const runId='dummy-boundary-'+crypto.randomUUID(),startedAt=new Date().toISOString();
 let before=null,after=null,scripts=null,error=null,records=[];
 try{
  preflight();before=await snapshotBrowserStorage();scripts=await scriptHashes();
  for(const entry of boundaryCases){
   const started=performance.now(),r=runBoundaryCase(modules,entry);
   records.push({...r,inputSha256:await sha256(entry.input),
    answerSha256:await sha256(JSON.stringify(r.answer)),
    durationMs:Math.round(performance.now()-started)});
  }
 }catch(e){error=String(e?.message||e);}
 finally{if(before)try{after=await snapshotBrowserStorage();}catch(e){error=error||String(e?.message||e);}}
 if(before&&after){
  const comparison=compareBrowserStorage(before,after);
  const integrity=!error&&scripts&&verifyPinnedScripts(scripts)&&
   comparison.essentialUnchanged&&comparison.status!=='changed'&&
   records.length===boundaryCases.length;
  report={schema:1,kind:'neryx-boundary-dummy-audit',runId,startedAt,
   modelId:'none-deterministic',scripts,records,storageBefore:before,
   storageAfter:after,comparison,
   result:!integrity?'rejected':records.every(r=>r.passed)?'all_passed':'findings'};
  $('results').textContent=records.map((r,i)=>
    (i+1)+'. '+(r.passed?'BESTANDEN':'BEFUND')+' – '+r.label+
    '\nEingabe: '+r.input+'\nAntwort: '+JSON.stringify(r.answer)).join('\n\n')+
    '\n\nSpeicher: '+comparison.status+'\nLauf-ID: '+runId;
  $('export').disabled=!integrity;
  $('status').textContent=!integrity?'Abgebrochen – Integritätsprüfung fehlgeschlagen.':
   report.result==='findings'?'Prüfung abgeschlossen – Schwachstellen entdeckt. JSON exportieren.':
   'Alle sechs Grenzwertfälle bestanden. JSON exportieren.';
 }else $('status').textContent='Abgebrochen: '+(error||'Speichervergleich nicht möglich.');
 running=false;$('run').disabled=false;
});
$('export').addEventListener('click',()=>{if(report&&report.result!=='rejected')download(report);});

import {run440Seed,join440} from './audit440.js';
const $=id=>document.getElementById(id);
const num=v=>v===null||v===undefined?'–':Number(v).toFixed(2);
const fmt=s=>`Fehler ${num(s.mae)} °C | Welten ${s.detectedWorlds}/${s.changedWorlds} | Eigenschaften ${s.keyHits}/${s.changedKeys} | Fehlalarme ${s.falseAlarms} | Verzögerung ${num(s.delay)} | Kontrollen ${s.checks}`;
let current=null,report='';
function archive(){try{const x=JSON.parse(localStorage.getItem('lernbot7.phase42.archive.v1'));return Array.isArray(x)?x.slice(0,8):[];}catch{return [];}}
function render(data){const out=['LERNBOT 7.0 – PHASE 4.4','STABILER ABSCHLUSS VON PHASE 4',`Seeds: ${data.seeds.join(', ')}`,'108 getrennte Testwelten · 90 Beobachtungen je Welt','',
 'GESAMT',`Blind-Basis: ${fmt(data.aggregate.blind)}`,`Hybrid (fixiert): ${fmt(data.aggregate.hybrid)}`,`Bestes Experiment: ${fmt(data.aggregate.bestExperimental)}`,`Sicherheitsauswahl 4.4: ${fmt(data.aggregate.selected)}`,''];
 for(const r of data.runs){out.push(`SEED ${r.seed}`,`Aktive Regel: ${r.selectedName}`,`Bestes Experiment: ${r.candidateName}`,`Trainingssichere Kandidaten: ${r.safeOnTraining}; validierte Kandidaten: ${r.safeOnValidation}`,
  'TRAINING',`Blind: ${fmt(r.training.blind)}`,`Kandidat: ${fmt(r.training.candidate)}`,
  'VALIDIERUNG',`Blind: ${fmt(r.validation.blind)}`,`Ausgewählte Regel: ${r.validation.accepted?fmt(r.validation.accepted):'keine; Rückfall auf Blind-Basis'}`,
  'TEST',`Blind: ${fmt(r.test.blind)}`,`Hybrid: ${fmt(r.test.hybrid)}`,`Experiment: ${fmt(r.test.bestExperimental)}`,`Aktiv: ${fmt(r.test.selected)}`);
  for(const s of r.byNoise)out.push(`RAUSCHEN ${num(s.noise)}`,`  Blind: ${fmt(s.blind)}`,`  Aktiv: ${fmt(s.selected)}`,`  Hybrid: ${fmt(s.hybrid)}`);
  out.push('');}
 out.push('METHODIK',...data.notes,'','FAZIT: Phase 4 ist als messbarer Simulations-Meilenstein abgeschlossen; kein allgemeiner Leistungsgewinn garantiert.');return out.join('\n');}
async function copy(v){try{await navigator.clipboard.writeText(v);$('status').textContent='Kopiert! Jetzt hier in ChatGPT einfügen.';}catch{$('report').focus();$('status').textContent='Falls Kopieren blockiert ist: Bericht lange gedrückt halten und kopieren.';}}
$('run').onclick=async()=>{const seed=Number($('seed').value);if(!Number.isSafeInteger(seed)||seed<1||seed>3900000000){$('status').textContent='Bitte einen gültigen Seed eingeben.';return;}
 $('run').disabled=true;for(const k of ['copy','json','download'])$(k).disabled=true;$('report').textContent='Training läuft …';
 try{const runs=[];for(let i=0;i<3;i++){$('status').textContent=`Abschlusstest: ${i+1} von 3 Durchläufen`;await new Promise(resolve=>setTimeout(resolve,30));runs.push(run440Seed(seed+[0,11003,22009][i],archive()));}
 current=join440(runs);report=render(current);$('report').textContent=report;$('status').textContent='Fertig! Ergebnisse können kopiert werden.';for(const k of ['copy','json','download'])$(k).disabled=false;
 }catch(err){console.error(err);$('report').textContent=err.stack||err.message;$('status').textContent='Fehler beim Test.';}finally{$('run').disabled=false;}};
$('copy').onclick=()=>report&&copy(report);
$('json').onclick=()=>current&&copy(JSON.stringify(current,null,2));
$('download').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lernbot-phase44-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);};

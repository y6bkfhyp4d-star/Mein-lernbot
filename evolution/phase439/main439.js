import {run439Seed,join439} from './audit439.js';
const $=id=>document.getElementById(id);
const n=x=>x==null?'–':Number(x).toFixed(2);
const fmt=x=>`Fehler ${n(x.mae)} °C | erkannt ${x.detected}/${x.changed} | Fehlalarme ${x.falseAlarms} | Verzögerung ${n(x.delay)} | Kontrollen ${x.checks}`;
let result=null,report='';
function archive(){try{const x=JSON.parse(localStorage.getItem('lernbot7.phase42.archive.v1'));return Array.isArray(x)?x.slice(0,8):[];}catch{return[];}}
function textReport(data){
 const out=['LERNBOT 7.0 – PHASE 4.3.9','Abschlussprüfung – Blindvergleich und Sicherheitsauswahl',`Start-Seeds: ${data.seeds.join(', ')}`,'108 neue Testwelten · 90 Messungen je Welt','', 'GESAMT (BLINDVERGLEICH)',`Blind-Basis: ${fmt(data.aggregate.blind)}`,`Sicherheitsauswahl: ${fmt(data.aggregate.selected)}`,`Experimentelle Regel: ${fmt(data.aggregate.experiment)}`,`Hybrid 4.3.7: ${fmt(data.aggregate.hybrid)}`,'',`Historische Basis 4.2 (nicht blind): ${fmt(data.aggregate.historical)}`];
 for(const r of data.runs){out.push('',`SEED ${r.seed}`,`Auswahl: ${r.selected}`,`Berechtigte Kandidaten: ${r.eligible}/${r.shortlisted}`,'TRAINING (30 Welten)',`Blind: ${fmt(r.training.blind)}`,`Bestes Experiment: ${fmt(r.training.best)}`,'VALIDIERUNG (24 Welten)',`Blind: ${fmt(r.validation.blind)}`,`Bestes Experiment: ${fmt(r.validation.best)}`,'TEST (36 Welten)',`Blind: ${fmt(r.test.blind)}`,`Aktiv: ${fmt(r.test.selected)}`,`Experiment: ${fmt(r.test.experiment)}`,`Hybrid: ${fmt(r.test.hybrid)}`,`Historisch: ${fmt(r.test.historical)}`);
  for(const z of r.byNoise)out.push(`  RAUSCHEN ${n(z.noise)}`,`  Blind: ${fmt(z.blind)}`,`  Aktiv: ${fmt(z.selected)}`);
 }
 out.push('','METHODIK',...data.methodology,'','FAZIT: Eine Freigabe erfolgt nur nach vorab definierten Trainings- und Validierungsregeln. Kein garantierter Leistungsgewinn.');return out.join('\n');
}
async function copy(s){try{await navigator.clipboard.writeText(s);$('status').textContent='Kopiert – jetzt in ChatGPT einfügen.';}catch{$('report').focus();$('report').select?.();$('status').textContent='Kopieren nicht möglich: Bericht gedrückt halten und „Kopieren“ wählen.';}}
$('run').onclick=async()=>{
 const s=Number($('seed').value);if(!Number.isSafeInteger(s)||s<1||s>3900000000){$('status').textContent='Bitte gültigen Seed eingeben.';return;}
 $('run').disabled=true;for(const k of ['copy','json','download'])$(k).disabled=true;
 $('report').textContent='Teste ...';const runs=[];
 try{for(let i=0;i<3;i++){$('status').textContent=`Trainieren und prüfen: ${i+1}/3`;await new Promise(r=>setTimeout(r,30));runs.push(run439Seed(s+[0,11003,22009][i],archive()));}
 result=join439(runs);report=textReport(result);$('report').textContent=report;$('status').textContent='Fertig. Du kannst die Ergebnisse kopieren.';for(const k of ['copy','json','download'])$(k).disabled=false;
 }catch(e){console.error(e);$('status').textContent='Fehler – siehe Bericht.';$('report').textContent=e.stack||e.message;}finally{$('run').disabled=false;}
};
$('copy').onclick=()=>report&&copy(report);
$('json').onclick=()=>result&&copy(JSON.stringify(result,null,2));
$('download').onclick=()=>{if(!report)return;const u=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='lernbot-phase439-ergebnisse.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);};

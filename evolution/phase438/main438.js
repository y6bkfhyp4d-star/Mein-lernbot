import {run438Seed,join438} from './guard438.js';
const $=id=>document.getElementById(id);
const n=x=>x==null?'–':Number(x).toFixed(2);
const fmt=s=>`Fehler ${n(s.mae)} °C | erkannt ${s.detected}/${s.changed} | Fehlalarme ${s.falseAlarms} | Verzögerung ${n(s.delay)} | Kontrollen ${s.checks}`;
let result=null,report='';
function archive(){try{const v=JSON.parse(localStorage.getItem('lernbot7.phase42.archive.v1'));return Array.isArray(v)?v.slice(0,8):[];}catch{return[];}}
function makeReport(x){
 const a=['LERNBOT 7.0 – PHASE 4.3.8 R2','Stabilitätsprüfung mit Validierungs-Schutz','108 getrennte Testwelten · Je Welt 90 Messungen',`Seeds: ${x.seeds.join(', ')}`,'','GESAMT','Basis 4.2: '+fmt(x.aggregate.base),'Experimentelle Zuverlässigkeitsprüfung: '+fmt(x.aggregate.experimental),'Vergleich 4.3.7: '+fmt(x.aggregate.hybrid),'Sicherheitsauswahl R2: '+fmt(x.aggregate.selected)];
 for(const r of x.runs){a.push('',`SEED ${r.seed}`,`Ausgewählt: ${r.selected.mode}`,r.selectedWhy,`Berechtigte Kandidaten: ${r.eligibleCount}/${r.shortlistedCount}`,'TRAINING (30 Welten)','  Basis: '+fmt(r.training.base),'  Beste experimentelle Regel: '+fmt(r.training.best),'VALIDIERUNG (24 Welten)','  Basis: '+fmt(r.validation.base),'  Beste experimentelle Regel: '+fmt(r.validation.best),'TEST (36 Welten)','  Basis: '+fmt(r.test.base),'  Experiment: '+fmt(r.test.experimental),'  Aktivierte Regel: '+fmt(r.test.selected));
  for(const z of r.byNoise)a.push(`  RAUSCHEN ${n(z.noise)}`,'    Basis: '+fmt(z.base),'    Aktiv: '+fmt(z.selected));
 }
 a.push('','METHODIK',...x.notes,'','WICHTIG: Die neue Regel wird nur bei erfüllten Sicherheitskriterien freigegeben. Der Filter garantiert auf unbekannten Welten keinen Vorteil.');return a.join('\n');
}
async function copyValue(value){try{if(!navigator.clipboard?.writeText)throw Error('No clipboard');await navigator.clipboard.writeText(value);$('status').textContent='Kopiert! Jetzt in ChatGPT einfügen.';}catch(e){const el=$('report'),selection=window.getSelection(),range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);$('status').textContent='Text markiert: gedrückt halten und „Kopieren“ wählen.';}}
$('run').addEventListener('click',async()=>{
 const seed=Number($('seed').value);if(!Number.isSafeInteger(seed)||seed<1||seed>3900000000){$('status').textContent='Bitte einen gültigen Seed zwischen 1 und 3900000000 eingeben.';return;}
 $('run').disabled=true;for(const id of ['copy','json','download'])$(id).disabled=true;result=null;report='';$('report').textContent='Berechnung läuft …';const runs=[];
 try{const previous=archive(),seeds=[seed,seed+11003,seed+22009];for(let i=0;i<3;i++){
  $('status').textContent=`Testlauf ${i+1} von 3 …`;
  // Yield to the UI between runs so iPhone Safari can update the progress text.
  await new Promise(resolve=>setTimeout(resolve,30));
  runs.push(run438Seed(seeds[i],previous));
 }
 result=join438(runs);report=makeReport(result);$('report').textContent=report;$('status').textContent='Fertig. Tippe auf „Ergebnisse kopieren“. ';for(const id of ['copy','json','download'])$(id).disabled=false;
 }catch(e){console.error(e);$('report').textContent=`Fehler: ${e.message}`;$('status').textContent='Fehler beim Test. Bitte den Fehlertext schicken.';}finally{$('run').disabled=false;}
});
$('copy').addEventListener('click',()=>report&&copyValue(report));
$('json').addEventListener('click',()=>result&&copyValue(JSON.stringify(result,null,2)));
$('download').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lernbot-phase438-r2-ergebnisse.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);});
